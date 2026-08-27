import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import {
  db,
} from '../firebase/firebase';

export type AdminAuditAction =
  | 'CUSTOMER_ACCOUNT_OPENED'
  | 'DOMAIN_ASSIGNED'
  | 'DOMAIN_NAMESERVERS_CHANGED'
  | 'DOMAIN_OWNER_CHANGED'
  | 'DOMAIN_STATUS_CHANGED'
  | 'DOMAIN_RENEWAL_DATE_CHANGED'
  | 'CUSTOMER_PROFILE_CHANGED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'ORDER_CANCELLED'
  | 'ORDER_DELETED';

export interface AdminAuditLog {
  id?: string;

  admin_user_id: string;
  admin_email: string;

  target_user_id?: string;
  target_user_email?: string;

  action: AdminAuditAction;

  resource_type:
    | 'customer'
    | 'domain'
    | 'payment'
    | 'order';

  resource_id?: string;
  resource_name?: string;

  before?: Record<
    string,
    unknown
  >;

  after?: Record<
    string,
    unknown
  >;

  description: string;

  created_at?: unknown;
}

class AdminAuditService {
  async log(
    entry: AdminAuditLog
  ) {
    await addDoc(
      collection(
        db,
        'admin_audit_logs'
      ),
      {
        ...entry,

        created_at:
          serverTimestamp(),
      }
    );
  }

  async getAll() {
    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            'admin_audit_logs'
          ),
          orderBy(
            'created_at',
            'desc'
          )
        )
      );

    return snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      })
    );
  }
}

export const adminAuditService =
  new AdminAuditService();