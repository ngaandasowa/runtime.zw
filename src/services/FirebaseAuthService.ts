import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';

import {
  auth,
} from '../firebase/firebase';

import {
  User,
} from '../types';

import {
  analyticsService,
} from './AnalyticsService';

export const toRuntimeUser = (
  user: FirebaseUser
): User => ({
  id: user.uid,

  name:
    user.displayName ||
    user.email?.split('@')[0] ||
    'Runtime user',

  email:
    user.email || '',

  role:
    'customer',

  email_verified_at:
    user.emailVerified
      ? new Date().toISOString()
      : null,

  created_at:
    user.metadata.creationTime ||
    new Date().toISOString(),
});

export const firebaseAuthService = {
  onUserChanged(
    callback: (
      user: User | null
    ) => void
  ) {
    return onAuthStateChanged(
      auth,
      (
        user
      ) => {
        callback(
          user
            ? toRuntimeUser(
                user
              )
            : null
        );
      }
    );
  },

  async signIn(
    email: string,
    password: string
  ) {
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    const result =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = toRuntimeUser(
      result.user
    );

    // Track sign-in event
    analyticsService.trackSignIn(
      email,
      'email'
    );

    analyticsService.setUser(user);

    return user;
  },

  async signUp(
    name: string,
    email: string,
    password: string
  ) {
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await updateProfile(
      result.user,
      {
        displayName:
          name,
      }
    );

    const user = toRuntimeUser(
      result.user
    );

    // Track sign-up event
    analyticsService.trackSignUp(
      email,
      'email'
    );

    analyticsService.setUser(user);

    return user;
  },

  async signInWithGoogle() {
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    const provider =
      new GoogleAuthProvider();

    const result =
      await signInWithPopup(
        auth,
        provider
      );

    const user = toRuntimeUser(
      result.user
    );

    // Track Google sign-in event
    analyticsService.trackSignIn(
      result.user.email || '',
      'google'
    );

    analyticsService.setUser(user);

    return user;
  },

  async resetPassword(
    email: string
  ) {
    await sendPasswordResetEmail(
      auth,
      email
    );
  },

  async signOut() {
    // Track sign-out event
    analyticsService.trackSignOut();

    await signOut(
      auth
    );
  },
};