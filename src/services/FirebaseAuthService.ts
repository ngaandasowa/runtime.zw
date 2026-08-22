import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { User } from '../types';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(config).every(value => value && !value.includes('YOUR_'));

const getFirebaseAuth = () => {
  requireFirebaseConfig();
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
};

export const requireFirebaseConfig = () => {
  if (!isConfigured) throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to your .env file.');
};

export const toRuntimeUser = (user: FirebaseUser): User => ({
  id: user.uid,
  name: user.displayName || user.email?.split('@')[0] || 'Runtime user',
  email: user.email || '',
  role: 'customer',
  email_verified_at: user.emailVerified ? new Date().toISOString() : null,
  created_at: user.metadata.creationTime || new Date().toISOString(),
});

export const firebaseAuthService = {
  onUserChanged(callback: (user: User | null) => void) {
    if (!isConfigured) {
      callback(null);
      return () => undefined;
    }
    return onAuthStateChanged(getFirebaseAuth(), user => callback(user ? toRuntimeUser(user) : null));
  },

  async signIn(email: string, password: string) {
    requireFirebaseConfig();
    const firebaseAuth = getFirebaseAuth();
    await setPersistence(firebaseAuth, browserLocalPersistence);
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return toRuntimeUser(result.user);
  },

  async signUp(name: string, email: string, password: string) {
    requireFirebaseConfig();
    const firebaseAuth = getFirebaseAuth();
    await setPersistence(firebaseAuth, browserLocalPersistence);
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(result.user, { displayName: name });
    return toRuntimeUser(result.user);
  },

  async signInWithGoogle() {
    requireFirebaseConfig();
    const firebaseAuth = getFirebaseAuth();
    await setPersistence(firebaseAuth, browserLocalPersistence);
    const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    return toRuntimeUser(result.user);
  },

  async resetPassword(email: string) {
    requireFirebaseConfig();
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  },

  async signOut() {
    if (isConfigured) await signOut(getFirebaseAuth());
  },
};
