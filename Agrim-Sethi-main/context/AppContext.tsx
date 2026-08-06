import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Listing, User } from '../types';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  listings: Listing[];
  addListing: (listing: Listing) => void;
  updateListing: (listing: Listing) => void;
  deleteListing: (id: string) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, email: string) => void;
  logout: () => void;
  notifications: Notification[];
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
}

const defaultListings: Listing[] = [
  {
    id: '1',
    title: 'Deadstock Denim - Indigo Wash',
    description: 'Heavyweight cotton blend, ideal for jackets and structured trousers.',
    uses: 'Jackets, Jeans, Bags',
    qty: 14.5,
    pricePerUnit: 1999,
    location: 'London, UK',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRWHYJqjdbP1wkxZKclD6rQH6RSuwAe3eyH7y-YZ1vfvhzixyMjkBdtub0lN6oSnc_35BgLzUXnKyxI26yIESuDrdDQ3aTUSKKxpg5SEedpNKaLJ3woP_TTn0IaKaBNvFgBDrZx9RRmHpkGsGzZ2EYjpuaY3aPGqcxv8huVbsXQHwSM9a4ySQ_Fbbb7B4qDns0pwNzaXpvj0hIxYhfF0RZ-_y7acH-AiolL1Rpy0dAw3-ksYLJuoV-z1g6KT4swcaoNR1G8bnv',
    material: 'Cotton',
    sellerName: 'TextileHub London',
    status: 'Available',
    dateListed: '2024-05-10'
  },
  {
    id: '2',
    title: 'Silk Charmeuse - Dusty Rose',
    description: 'Lightweight, fluid drape with a subtle satin sheen for evening wear.',
    uses: 'Dresses, Blouses, Scarves',
    qty: 5.0,
    pricePerUnit: 3499,
    location: 'Paris, France',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDPrrvBYHqOMRTZlRwHDlXojMVIntvnfpUjQnySBuHr9Yyak_ydKyvTm_btmSS0JyJDR6bh3L_M0x5AmvyBDWvqqYYDjhVg00ZpZC89yep5GqheEmKTeJky0A94ZFUfNJeqHPElj_IB-Fzzd-2S8EIPHrPGNGube6kK7CwCcL7mQKafD66spB0Z2BxT5zmlag_LHzASMwSMu6G_fO1zM4F7Y-qozIp7AcPgfBSAX60PJh0aFgwG09aX3QLtiEVABB2yYdJOGrM',
    material: 'Silk',
    sellerName: 'Paris Atelier',
    status: 'Available',
    dateListed: '2024-05-12'
  },
  {
    id: '3',
    title: 'Organic Herringbone - Stone',
    description: 'GOTS certified organic cotton with a classic woven pattern.',
    uses: 'Shirts, Trousers, Home Decor',
    qty: 22.0,
    pricePerUnit: 1499,
    location: 'Berlin, Germany',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPzNjtRI1bvsdUtYGAnk_vzeMgtyZ7iGp4IcBde1S1xFoEZyXqkoZHXXyCZ6GX7Q2_Tnpbg3x3d1lSSLYEbIKZClqQREXWzp7aM-4OvxK3DwWkjzMApJlzjEj3u9qD3ofjuBAiYCc_MxOTAa7xFcLonZFHaYki6GXghAJbDZPuHJWb0w5EgKw5NcuIlUdsYqH_sH-Y9kdedzP86h0OQ_g4eX5Rl1UVgyeTJ91EbkP2DH47OW6kVwphnLAT-_f8ycdVb4WctRrT',
    material: 'Cotton',
    sellerName: 'EcoFab Distro',
    status: 'Available',
    dateListed: '2024-05-15'
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load listings from local storage if available to persist data
  const [listings, setListings] = useState<Listing[]>(() => {
    try {
      const saved = localStorage.getItem('reweave_listings');
      return saved ? JSON.parse(saved) : defaultListings;
    } catch {
      return defaultListings;
    }
  });

  // Load user from local storage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('reweave_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Persist listings changes
  useEffect(() => {
    localStorage.setItem('reweave_listings', JSON.stringify(listings));
  }, [listings]);

  // Persist user changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('reweave_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('reweave_user');
    }
  }, [currentUser]);

  const addListing = (listing: Listing) => {
    setListings(prev => [listing, ...prev]);
  };

  const updateListing = (updatedListing: Listing) => {
    setListings(prev => prev.map(l => l.id === updatedListing.id ? updatedListing : l));
  };

  const deleteListing = (id: string) => {
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const login = (username: string, email: string) => {
    setCurrentUser({
      username,
      email,
      type: 'Seller', // Default to Seller for demo flow
      avatarUrl: undefined
    });
  };

  const logout = () => {
    setCurrentUser(null);
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
      addListing, 
      updateListing, 
      deleteListing,
      currentUser, 
      setCurrentUser,
      login,
      logout,
      notifications,
      showNotification,
      removeNotification
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