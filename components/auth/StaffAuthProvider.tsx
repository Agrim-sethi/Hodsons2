import React from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const STAFF_USER_EMAILS: Record<string, string> = {
  SNA: import.meta.env.VITE_FIREBASE_STAFF_EMAIL || 'sna@hodsons-848af.firebaseapp.com'
};

export type StaffAuthContextValue = {
  isLoggedIn: boolean;
  authLoading: boolean;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const StaffAuthContext = React.createContext<StaffAuthContextValue | null>(null);

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    const auth = getAuth();

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoggedIn(false);
        setAuthLoading(false);
        return;
      }

      try {
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));
        const active = staffDoc.exists() && staffDoc.data()?.active === true;
        if (!active) {
          await signOut(auth);
        }
        setIsLoggedIn(active);
      } catch (error) {
        console.error('Staff profile lookup failed:', error);
        await signOut(auth);
        setIsLoggedIn(false);
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  const login = React.useCallback(async (userId: string, password: string) => {
    const normalizedId = userId.trim().toUpperCase();
    const email = STAFF_USER_EMAILS[normalizedId];
    if (!email || !password) return false;

    try {
      const auth = getAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const staffDoc = await getDoc(doc(db, 'staff', credential.user.uid));
      const active = staffDoc.exists() && staffDoc.data()?.active === true;

      if (!active) {
        await signOut(auth);
        return false;
      }

      setIsLoggedIn(true);
      return true;
    } catch (error) {
      console.error('Staff login failed:', error);
      setIsLoggedIn(false);
      return false;
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await signOut(getAuth());
    } finally {
      setIsLoggedIn(false);
    }
  }, []);

  return (
    <StaffAuthContext.Provider value={{ isLoggedIn, authLoading, login, logout }}>
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
