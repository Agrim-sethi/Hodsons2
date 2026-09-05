import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth, db, FIREBASE_STAFF_EMAIL } from '../../utils/firebase';

const STAFF_USER_ID = 'SNA';

type StaffAuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  login: (userIdOrEmail: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const StaffAuthContext = React.createContext<StaffAuthContextValue | null>(null);

const resolveStaffEmail = (userIdOrEmail: string) => {
  const value = userIdOrEmail.trim();
  if (value.includes('@')) return value;
  if (value.toUpperCase() === STAFF_USER_ID && FIREBASE_STAFF_EMAIL) return FIREBASE_STAFF_EMAIL;
  return '';
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

      try {
        const staffDoc = await getDoc(doc(db, 'staff', nextUser.uid));
        const staffData = staffDoc.exists() ? staffDoc.data() : null;

        if (staffData?.active === true) {
          setUser(nextUser);
        } else {
          await signOut(auth);
          setUser(null);
        }
      } catch (error) {
        console.error('Staff profile verification error:', error);
        await signOut(auth);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  const login = React.useCallback(async (userIdOrEmail: string, password: string) => {
    const email = resolveStaffEmail(userIdOrEmail);
    if (!email || !password) return false;

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const staffDoc = await getDoc(doc(db, 'staff', credential.user.uid));
      const staffData = staffDoc.exists() ? staffDoc.data() : null;

      if (staffData?.active !== true) {
        await signOut(auth);
        return false;
      }

      setUser(credential.user);
      return true;
    } catch (error) {
      console.error('Firebase staff login error:', error);
      setUser(null);
      return false;
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
