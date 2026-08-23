import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { User } from '../types';

export type RuntimeUserRole =
  | 'customer'
  | 'super_admin'
  | 'registry_admin'
  | 'billing_admin';

export type RuntimeUserProfile = User & {
  status: 'active' | 'suspended';
  updated_at: string;
};

class UserService {
  async getAllUsers(): Promise<RuntimeUserProfile[]> {
    const snapshot = await getDocs(
      collection(db, 'users')
    );

    return snapshot.docs.map((item) => {
      const data =
        item.data() as RuntimeUserProfile;

      return {
        ...data,
        id: data.id || item.id,
      };
    });
  }

  async getUser(
    uid: string
  ): Promise<RuntimeUserProfile | null> {
    const ref = doc(
      db,
      'users',
      uid
    );

    const snapshot =
      await getDoc(ref);

    if (!snapshot.exists()) {
      return null;
    }

    const data =
      snapshot.data() as RuntimeUserProfile;

    return {
      ...data,
      id: data.id || snapshot.id,
    };
  }

  async createUser(
    profile: RuntimeUserProfile
  ) {
    const ref = doc(
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
  ): Promise<RuntimeUserProfile> {
    const existing =
      await this.getUser(
        user.id
      );

    if (existing) {
      return existing;
    }

    const now =
      new Date().toISOString();

    const profile: RuntimeUserProfile = {
      ...user,
      role: 'customer',
      status: 'active',
      updated_at: now,
    };

    await this.createUser(
      profile
    );

    return profile;
  }

  async updateProfile(
    uid: string,
    changes: Partial<RuntimeUserProfile>
  ) {
    const ref = doc(
      db,
      'users',
      uid
    );

    await updateDoc(
      ref,
      {
        ...changes,
        updated_at:
          new Date().toISOString(),
      }
    );
  }
}

export const userService =
  new UserService();