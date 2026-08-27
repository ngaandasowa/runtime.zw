import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { Domain } from '../types';

class DomainRepository {
  async createDomain(
    domain: Domain
  ): Promise<Domain> {
    const ref = doc(
      db,
      'domains',
      domain.id
    );

    await setDoc(
      ref,
      domain
    );

    return domain;
  }

  async getDomainsForUser(
    userId: string
  ): Promise<Domain[]> {
    const q = query(
      collection(db, 'domains'),
      where('user_id', '==', userId)
    );

    const snapshot =
      await getDocs(q);

    return snapshot.docs.map(
      (item) => ({
        ...(item.data() as Domain),
        id:
          (item.data() as Domain).id ||
          item.id,
      })
    );
  }

  async getAllDomains(): Promise<Domain[]> {
    const snapshot =
      await getDocs(
        collection(db, 'domains')
      );

    return snapshot.docs.map(
      (item) => ({
        ...(item.data() as Domain),
        id:
          (item.data() as Domain).id ||
          item.id,
      })
    );
  }

  async deleteDomain(
    domainId: string
  ): Promise<void> {
    await deleteDoc(
      doc(
        db,
        'domains',
        domainId
      )
    );
  }

  async updateDomain(
    domainId: string,
    changes: Partial<Domain>
  ) {
    const ref = doc(
      db,
      'domains',
      domainId
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

export const domainRepository =
  new DomainRepository();