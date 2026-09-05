import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth, db, FIREBASE_STAFF_EMAIL } from '../../utils/firebase';

const STAFF_USER_ID = 'SNA';

type StaffLoginResult = {
  success: boolean;
  error?: string;
};

type StaffAuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  login: (userIdOrEmail: string, password: string) => Promise<StaffLoginResult>;
  logout: () => Promise<void>;
};

const StaffAuthContext = React.createContext<StaffAuthContextValue | null>(null);

const resolveStaffEmail = (userIdOrEmail: string) => {
  const value = userIdOrEmail.trim();
  if (value.includes('@')) return value;
  if (value.toUpperCase() === STAFF_USER_ID && FIREBASE_STAFF_EMAIL) return FIREBASE_STAFF_EMAIL;
  return '';
};

const firebaseAuthMessage = (code: string) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Firebase rejected this email address as invalid.';
    case 'auth/user-disabled':
      return 'This Firebase Authentication account is disabled.';
    case 'auth/user-not-found':
      return 'No Firebase Authentication account exists for this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Firebase rejected the email/password. Check the password and make sure you are using the account from the HODSONS1 Firebase project.';
    case 'auth/too-many-requests':
      return 'Firebase has temporarily blocked sign-in attempts from this device. Wait a little and try again.';
    case 'auth/network-request-failed':
      return 'Firebase could not be reached. Check the network connection or VPN and try again.';
    case 'permission-denied':
      return 'Firebase Authentication succeeded, but Firestore denied access to the staff profile. Check that the deployed Firestore rules allow the signed-in user to read staff/{UID}.';
    default:
      return `Firebase sign-in failed (${code}). Check the browser console for the full error.`;
  }
};

const verifyStaffProfile = async (firebaseUser: User) => {
  try {
    const staffDoc = await getDoc(doc(db, 'staff', firebaseUser.uid));
    const staffData = staffDoc.exists() ? staffDoc.data() : null;

    if (!staffDoc.exists()) {
      return { ok: false as const, error: `Firebase login succeeded, but no Firestore staff profile exists for UID ${firebaseUser.uid}.` };
    }

    if (staffData?.active !== true) {
      return { ok: false as const, error: 'Firebase login succeeded, but this staff profile is not active. Set active to true in Firestore.' };
    }

    return { ok: true as const };
  } catch (error: any) {
    const code = error?.code || 'unknown';
    return { ok: false as const, error: firebaseAuthMessage(code) };
  }
};

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const verification = await verifyStaffProfile(nextUser);
      if (verification.ok) {
        setUser(nextUser);
      } else {
        await signOut(auth);
        setUser(null);
        console.error('Staff profile verification failed:', verification.error);
      }
      setIsLoading(false);
    });
  }, []);

  const login = React.useCallback(async (userIdOrEmail: string, password: string): Promise<StaffLoginResult> => {
    const email = resolveStaffEmail(userIdOrEmail);
    if (!email) {
      return {
        success: false,
        error: userIdOrEmail.trim().toUpperCase() === STAFF_USER_ID
          ? 'SNA is not mapped to a Firebase email in this deployment. Enter the Firebase Auth email directly, or configure VITE_FIREBASE_STAFF_EMAIL in Vercel.'
          : 'Enter the Firebase Authentication email address.'
      };
    }

    if (!password) {
      return { success: false, error: 'Enter the Firebase account password.' };
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const verification = await verifyStaffProfile(credential.user);

      if (!verification.ok) {
        await signOut(auth);
        setUser(null);
        return { success: false, error: verification.error };
      }

      setUser(credential.user);
      return { success: true };
    } catch (error: any) {
      console.error('Firebase staff login error:', error);
      setUser(null);
      return {
        success: false,
        error: firebaseAuthMessage(error?.code || 'unknown')
      };
    }
  }, []);

  const logout = React.useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  return (
    <StaffAuthContext.Provider value={{ isLoggedIn: Boolean(user), isLoading, user, login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuth = () => {
  const context = React.useContext(StaffAuthContext);
  if (!context) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
};
