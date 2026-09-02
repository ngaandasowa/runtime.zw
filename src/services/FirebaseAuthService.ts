import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

import {
  auth,
} from '../firebase/firebase';

import type {
  User,
} from '../types';

import {
  emailValidationService,
} from './EmailValidationService';

export const normalizeEmail = (
  email: string
) =>
  email
    .trim()
    .toLowerCase();

export const isValidEmailAddress = (
  email: string
) => {
  const value =
    normalizeEmail(email);

  if (
    value.length < 6 ||
    value.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
    value
  );
};

const friendlyAuthMessage = (
  error: unknown
) => {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(
          (error as {
            code?: unknown;
          }).code || ''
        )
      : '';

  const messages:
    Record<string, string> = {
      'auth/invalid-email':
        'Enter a valid email address.',
      'auth/missing-email':
        'Enter your email address.',
      'auth/missing-password':
        'Enter your password.',
      'auth/invalid-credential':
        'The email or password is incorrect.',
      'auth/wrong-password':
        'The email or password is incorrect.',
      'auth/user-not-found':
        'The email or password is incorrect.',
      'auth/user-disabled':
        'This account has been disabled. Contact Runtime support.',
      'auth/email-already-in-use':
        'An account already exists with this email address.',
      'auth/weak-password':
        'Choose a stronger password with at least 6 characters.',
      'auth/too-many-requests':
        'Too many attempts. Try again later or reset your password.',
      'auth/network-request-failed':
        'We could not reach the sign-in service. Check your connection and try again.',
      'auth/popup-closed-by-user':
        'Google sign-in was cancelled.',
      'auth/cancelled-popup-request':
        'Google sign-in was cancelled.',
      'auth/popup-blocked':
        'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
      'auth/account-exists-with-different-credential':
        'An account already exists with this email using another sign-in method.',
      'auth/requires-recent-login':
        'For security, sign in again before making this change.',
      'auth/operation-not-allowed':
        'This sign-in method is not available right now.',
      'auth/expired-action-code':
        'This link has expired. Request a new one.',
      'auth/invalid-action-code':
        'This link is invalid or has already been used.',
    };

  return (
    messages[code] ||
    'We could not complete that request. Please try again.'
  );
};

const throwFriendly =
  (error: unknown): never => {
    throw new Error(
      friendlyAuthMessage(error)
    );
  };

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

const verificationActionSettings = {
  url:
    'https://runtime.co.zw/dashboard',
  handleCodeInApp:
    false,
};

export const firebaseAuthService = {
  onUserChanged(
    callback: (
      user: User | null
    ) => void
  ) {
    return onAuthStateChanged(
      auth,
      (user) => {
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
  ): Promise<User> {
    const normalized =
      normalizeEmail(email);

    if (
      !isValidEmailAddress(
        normalized
      )
    ) {
      throw new Error(
        'Enter a valid email address.'
      );
    }

    if (!password) {
      throw new Error(
        'Enter your password.'
      );
    }

    try {
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      const result =
        await signInWithEmailAndPassword(
          auth,
          normalized,
          password
        );

      return toRuntimeUser(
        result.user
      );
    } catch (error) {
      return throwFriendly(error);
    }
  },

  async signUp(
    name: string,
    email: string,
    password: string
  ): Promise<User> {
    const normalizedName =
      name.trim();

    const normalizedEmail =
      normalizeEmail(email);

    if (
      normalizedName.length < 2
    ) {
      throw new Error(
        'Enter your full name.'
      );
    }

    if (
      !isValidEmailAddress(
        normalizedEmail
      )
    ) {
      throw new Error(
        'Enter a valid email address, for example name@example.com.'
      );
    }

    if (
      password.length < 6
    ) {
      throw new Error(
        'Your password must contain at least 6 characters.'
      );
    }

    /*
     * New email/password registrations are checked by Runtime's
     * backend before Firebase creates an account.
     *
     * Google sign-in is intentionally not sent through this check:
     * Google is the identity provider and Firebase already receives
     * that provider's verified email state.
     */
    const emailCheck =
      await emailValidationService
        .validateForRegistration(
          normalizedEmail
        );

    const checkedEmail =
      emailCheck.normalizedEmail ||
      normalizedEmail;

    try {
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      const result =
        await createUserWithEmailAndPassword(
          auth,
          checkedEmail,
          password
        );

      await updateProfile(
        result.user,
        {
          displayName:
            normalizedName,
        }
      );

      /*
       * Account creation succeeds even though the mailbox has not
       * been verified yet. Runtime keeps the session active and
       * records the account as unverified until this link is used.
       */
      try {
        await sendEmailVerification(
          result.user,
          verificationActionSettings
        );
      } catch (verificationError) {
        console.error(
          'Verification email could not be sent:',
          verificationError
        );
      }

      return toRuntimeUser(
        result.user
      );
    } catch (error) {
      return throwFriendly(error);
    }
  },

  async signInWithGoogle():
    Promise<User> {
    try {
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt:
          'select_account',
      });

      const result =
        await signInWithPopup(
          auth,
          provider
        );

      return toRuntimeUser(
        result.user
      );
    } catch (error) {
      return throwFriendly(error);
    }
  },

  async resetPassword(
    email: string
  ) {
    const normalized =
      normalizeEmail(email);

    if (
      !isValidEmailAddress(
        normalized
      )
    ) {
      throw new Error(
        'Enter a valid email address.'
      );
    }

    try {
      await sendPasswordResetEmail(
        auth,
        normalized,
        {
          url:
            'https://runtime.co.zw/login',
        }
      );
    } catch (error) {
      /*
       * Firebase projects with email-enumeration protection may not
       * reveal whether an account exists. Keep the customer-facing
       * response generic.
       */
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error
          ? String(
              (error as {
                code?: unknown;
              }).code || ''
            )
          : '';

      if (
        code ===
        'auth/user-not-found'
      ) {
        return;
      }

      throwFriendly(error);
    }
  },

  async sendVerificationEmail() {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        'Sign in before requesting a verification email.'
      );
    }

    if (user.emailVerified) {
      return;
    }

    try {
      await sendEmailVerification(
        user,
        verificationActionSettings
      );
    } catch (error) {
      throwFriendly(error);
    }
  },

  async refreshVerificationStatus():
    Promise<User> {
    const firebaseUser =
      auth.currentUser;

    if (!firebaseUser) {
      throw new Error(
        'You must be signed in to refresh verification status.'
      );
    }

    try {
      /*
       * Firebase keeps the authenticated user object in memory.
       * After the customer clicks the verification link in their
       * email, reload() asks Firebase for the latest emailVerified
       * value without requiring sign-out/sign-in.
       */
      await firebaseUser.reload();

      const refreshedUser =
        auth.currentUser;

      if (!refreshedUser) {
        throw new Error(
          'Your session could not be refreshed. Please sign in again.'
        );
      }

      return toRuntimeUser(
        refreshedUser
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message ===
            'Your session could not be refreshed. Please sign in again.' ||
          error.message ===
            'You must be signed in to refresh verification status.'
        )
      ) {
        throw error;
      }

      return throwFriendly(
        error
      );
    }
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ) {
    const user =
      auth.currentUser;

    if (
      !user ||
      !user.email
    ) {
      throw new Error(
        'Sign in again before changing your password.'
      );
    }

    if (
      newPassword.length < 6
    ) {
      throw new Error(
        'Your new password must contain at least 6 characters.'
      );
    }

    const usesPassword =
      user.providerData.some(
        (provider) =>
          provider.providerId ===
          'password'
      );

    if (!usesPassword) {
      throw new Error(
        'This account uses Google sign-in, so there is no Runtime password to change.'
      );
    }

    if (!currentPassword) {
      throw new Error(
        'Enter your current password.'
      );
    }

    try {
      const credential =
        EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

      await reauthenticateWithCredential(
        user,
        credential
      );

      await updatePassword(
        user,
        newPassword
      );
    } catch (error) {
      throwFriendly(error);
    }
  },

  async signOut() {
    try {
      await signOut(
        auth
      );
    } catch (error) {
      throwFriendly(error);
    }
  },
};
