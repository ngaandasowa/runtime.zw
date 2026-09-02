import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  db,
} from '../firebase/firebase';

import type {
  User,
} from '../types';

export type RuntimeUserRole =
  | 'customer'
  | 'super_admin'
  | 'registry_admin'
  | 'billing_admin';

export type RuntimeUserProfile =
  User & {
    status:
      | 'active'
      | 'suspended';

    updated_at:
      string;
  };

class UserService {
  async getAllUsers():
    Promise<
      RuntimeUserProfile[]
    > {
    const snapshot =
      await getDocs(
        collection(
          db,
          'users'
        )
      );

    return snapshot.docs.map(
      (item) => {
        const data =
          item.data() as
            RuntimeUserProfile;

        return {
          ...data,
          id:
            data.id ||
            item.id,
        };
      }
    );
  }

  async getUser(
    uid: string
  ): Promise<
    RuntimeUserProfile | null
  > {
    const ref =
      doc(
        db,
        'users',
        uid
      );

    const snapshot =
      await getDoc(
        ref
      );

    if (
      !snapshot.exists()
    ) {
      return null;
    }

    const data =
      snapshot.data() as
        RuntimeUserProfile;

    return {
      ...data,
      id:
        data.id ||
        snapshot.id,
    };
  }

  async createUser(
    profile:
      RuntimeUserProfile
  ) {
    const ref =
      doc(
        db,
        'users',
        profile.id
      );

    await setDoc(
      ref,
      profile
    );

    return profile;
  }

  async ensureUser(
    user: User
  ): Promise<
    RuntimeUserProfile
  > {
    const existing =
      await this.getUser(
        user.id
      );

    const now =
      new Date()
        .toISOString();

    if (existing) {
      /*
       * Firebase Auth is authoritative for identity state.
       *
       * This is especially important for Google accounts:
       * Firebase reports the Google email as verified, while an
       * older Firestore user document may still contain
       * email_verified_at: null.
       *
       * Never return the old Firestore profile before reconciling
       * these fields.
       */
      const merged:
        RuntimeUserProfile = {
          ...existing,

          name:
            user.name ||
            existing.name,

          email:
            user.email ||
            existing.email,

          /*
           * If Firebase says the current identity is verified,
           * promote the Runtime profile to verified.
           *
           * Do not destroy an existing verification timestamp just
           * because a stale auth object temporarily reports null.
           */
          email_verified_at:
            user.email_verified_at ||
            existing.email_verified_at ||
            null,

          updated_at:
            now,
        };

      const changed =
        merged.name !==
          existing.name ||
        merged.email !==
          existing.email ||
        merged.email_verified_at !==
          existing.email_verified_at;

      if (changed) {
        await updateDoc(
          doc(
            db,
            'users',
            user.id
          ),
          {
            name:
              merged.name,

            email:
              merged.email,

            email_verified_at:
              merged.email_verified_at,

            updated_at:
              now,
          }
        );
      }

      return merged;
    }

    const profile:
      RuntimeUserProfile = {
        ...user,

        role:
          'customer',

        status:
          'active',

        email_verified_at:
          user.email_verified_at ||
          null,

        updated_at:
          now,
    };

    await this.createUser(
      profile
    );

    return profile;
  }

  async updateProfile(
    uid: string,
    changes:
      Partial<
        RuntimeUserProfile
      >
  ) {
    const ref =
      doc(
        db,
        'users',
        uid
      );

    await updateDoc(
      ref,
      {
        ...changes,

        updated_at:
          new Date()
            .toISOString(),
      }
    );
  }
}

export const userService =
  new UserService();
