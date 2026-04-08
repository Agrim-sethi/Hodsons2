import React from 'react';

const STAFF_AUTH_KEY = 'sanawar_staff_logged_in';
const STAFF_USER_ID = 'SNA';
const STAFF_PASSWORD = 'HODSONS123';

type StaffAuthContextValue = {
  isLoggedIn: boolean;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
};

const StaffAuthContext = React.createContext<StaffAuthContextValue | null>(null);

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STAFF_AUTH_KEY) === 'true';
  });

  const login = React.useCallback((userId: string, password: string) => {
    const success = userId.trim().toUpperCase() === STAFF_USER_ID && password === STAFF_PASSWORD;
    if (success) {
      window.localStorage.setItem(STAFF_AUTH_KEY, 'true');
      setIsLoggedIn(true);
    }
    return success;
  }, []);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem(STAFF_AUTH_KEY);
    setIsLoggedIn(false);
  }, []);

  return (
    <StaffAuthContext.Provider value={{ isLoggedIn, login, logout }}>
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
