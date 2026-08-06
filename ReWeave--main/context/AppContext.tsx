import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Listing, User } from '../types';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { auth } from '../config/firebase';
import { normalizeAccountType } from '../constants/accountTypes';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  listings: Listing[];
  isLoading: boolean;
  addListing: (listing: Listing) => Promise<void>;
  updateListing: (listing: Listing) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => Promise<void>;
  logout: () => void;
  getUser: (companyName: string) => User | undefined;
  users: User[];
  interestedListingIds: string[];
  addInterest: (id: string) => Promise<void>;
  notifications: Notification[];
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
  showProfileSetup: boolean;
  setShowProfileSetup: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [usersDB, setUsersDB] = useState<User[]>([]);
  const [interestedListingIds, setInterestedListingIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const syncUserInState = (user: User | null) => {
    if (!user) return;

    const normalizedUser = {
      ...user,
      type: normalizeAccountType(user.type)
    };

    setUsersDB((prev) => {
      const idx = prev.findIndex((existing) => existing.email === normalizedUser.email);
      if (idx === -1) {
        return [...prev, normalizedUser];
      }

      const next = [...prev];
      next[idx] = normalizedUser;
      return next;
    });
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          const userData = await authService.getUserData(firebaseUser.uid);
          if (userData) {
            const normalizedUser = { ...userData, type: normalizeAccountType(userData.type) };
            setCurrentUserState(normalizedUser);
            syncUserInState(normalizedUser);
            const interests = await storageService.getUserInterests(firebaseUser.uid);
            setInterestedListingIds(interests);
          }
        } else {
          // User is signed out
          setCurrentUserState(null);
          setInterestedListingIds([]);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedListings, fetchedUsers] = await Promise.all([
          storageService.getListings(),
          storageService.getUsers()
        ]);

        setListings(fetchedListings);
        setUsersDB(fetchedUsers.map((user) => ({ ...user, type: normalizeAccountType(user.type) })));
      } catch (error) {
        console.error("Failed to load data:", error);
        showNotification("Failed to load application data", "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const setCurrentUser = async (user: User | null) => {
    const normalizedUser = user ? { ...user, type: normalizeAccountType(user.type) } : null;
    setCurrentUserState(normalizedUser);
    syncUserInState(normalizedUser);

    if (normalizedUser && auth.currentUser) {
      const interests = await storageService.getUserInterests(auth.currentUser.uid);
      setInterestedListingIds(interests);
    } else {
      setInterestedListingIds([]);
    }
  };

  const addListing = async (listing: Listing) => {
    await storageService.saveListing(listing);
    const newListings = await storageService.getListings();
    setListings(newListings);
  };

  const updateListing = async (updatedListing: Listing) => {
    await storageService.updateListing(updatedListing);
    const newListings = listings.map(l => l.id === updatedListing.id ? updatedListing : l);
    setListings(newListings);
  };

  const deleteListing = async (id: string) => {
    await storageService.deleteListing(id);
    const newListings = listings.filter(l => l.id !== id);
    setListings(newListings);
  };

  const logout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Failed to logout", "error");
    }
  };

  const getUser = (companyName: string) => {
    return usersDB.find(u => u.companyName === companyName);
  };

  const addInterest = async (id: string) => {
    if (!currentUser || !auth.currentUser) return;

    const alreadyInterested = interestedListingIds.includes(id);
    if (alreadyInterested) return;

    const newIds = [...interestedListingIds, id];
    setInterestedListingIds(newIds);
    await storageService.saveUserInterests(auth.currentUser.uid, newIds);
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <AppContext.Provider value={{
      listings,
      isLoading: loading,
      addListing,
      updateListing,
      deleteListing,
      currentUser,
      setCurrentUser,
      logout,
      getUser,
      users: usersDB,
      interestedListingIds,
      addInterest,
      notifications,
      showNotification,
      removeNotification,
      showProfileSetup,
      setShowProfileSetup
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
