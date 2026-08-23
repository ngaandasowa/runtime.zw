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

    return toRuntimeUser(
      result.user
    );
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

    return toRuntimeUser(
      result.user
    );
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

    return toRuntimeUser(
      result.user
    );
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
    await signOut(
      auth
    );
  },
};