import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import { DEFAULT_ACCOUNT_TYPE, normalizeAccountType } from '../constants/accountTypes';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  // Sign up with email and password
  signupWithEmail: async (
    email: string,
    password: string,
    userData: Omit<User, 'email'>
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user document in Firestore
      const user: User = {
        email,
        companyName: userData.companyName,
        phoneNumber: userData.phoneNumber,
        type: normalizeAccountType(userData.type),
        avatarUrl: userData.avatarUrl
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), user);

      return { success: true, user };
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Contact support';
      }
      
      return { success: false, error: errorMessage };
    }
  },

  // Sign in with email and password
  loginWithEmail: async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const user = userDoc.data() as User;
        return { success: true, user };
      } else {
        return { success: false, error: 'User data not found' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid credentials';
      
      if (error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      }
      
      return { success: false, error: errorMessage };
    }
  },

  // Sign in with Google
  signInWithGoogle: async (
    defaultUserType: string = DEFAULT_ACCOUNT_TYPE
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user document exists
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let user: User;

      if (userDoc.exists()) {
        // Existing user
        user = userDoc.data() as User;
        user = {
          ...user,
          type: normalizeAccountType(user.type)
        };
      } else {
        // New user - create document
        user = {
          email: firebaseUser.email || '',
          companyName: firebaseUser.displayName || 'User',
          phoneNumber: firebaseUser.phoneNumber || '',
          type: normalizeAccountType(defaultUserType || DEFAULT_ACCOUNT_TYPE),
          avatarUrl: firebaseUser.photoURL || undefined
        };
        await setDoc(userDocRef, user);
      }

      return { success: true, user };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked by browser';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in cancelled';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized. Contact support';
      }
      
      return { success: false, error: errorMessage };
    }
  },

  // Sign out
  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Get current Firebase user
  getCurrentFirebaseUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  // Auth state listener
  onAuthStateChange: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get user data from Firestore
  getUserData: async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const user = userDoc.data() as User;
        return {
          ...user,
          type: normalizeAccountType(user.type)
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
};
