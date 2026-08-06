import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Listing, User } from '../types';
import { normalizeAccountType } from '../constants/accountTypes';

export const storageService = {
  // Listings
  getListings: async (): Promise<Listing[]> => {
    try {
      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, orderBy('dateListed', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const listings: Listing[] = [];
      querySnapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() } as Listing);
      });
      
      return listings;
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  },

  saveListing: async (listing: Listing): Promise<void> => {
    try {
      if (listing.id) {
        // Update existing listing
        await setDoc(doc(db, 'listings', listing.id), listing);
      } else {
        // Create new listing
        await addDoc(collection(db, 'listings'), listing);
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      throw error;
    }
  },

  updateListing: async (listing: Listing): Promise<void> => {
    try {
      const listingRef = doc(db, 'listings', listing.id);
      await updateDoc(listingRef, listing as any);
    } catch (error) {
      console.error('Error updating listing:', error);
      throw error;
    }
  },

  deleteListing: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'listings', id));
    } catch (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  },

  // User data (kept for compatibility, but auth is handled by authService)
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const user = userDoc.data() as User;
        return { ...user, type: normalizeAccountType(user.type) };
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },

  // Users Database
  getUsers: async (): Promise<User[]> => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const user = doc.data() as User;
        users.push({ ...user, type: normalizeAccountType(user.type) });
      });
      
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  getUserByCompanyName: async (companyName: string): Promise<User | null> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('companyName', '==', companyName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const user = querySnapshot.docs[0].data() as User;
        return { ...user, type: normalizeAccountType(user.type) };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by company name:', error);
      return null;
    }
  },

  // User Interests
  getUserInterests: async (userId: string): Promise<string[]> => {
    try {
      const interestsDoc = await getDoc(doc(db, 'interests', userId));
      if (interestsDoc.exists()) {
        return interestsDoc.data().listingIds || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching user interests:', error);
      return [];
    }
  },

  saveUserInterests: async (userId: string, interests: string[]): Promise<void> => {
    try {
      await setDoc(doc(db, 'interests', userId), {
        listingIds: interests,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving interests:', error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updates as any);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
};
