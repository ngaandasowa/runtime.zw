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
  | 'PAYMENT_DELETED'
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

/*
 * Firestore rejects undefined anywhere inside a document,
 * including nested before/after audit objects.
 *
 * Keep null values, remove undefined recursively.
 */
const stripUndefined =
  (value: unknown): unknown => {
    if (
      Array.isArray(value)
    ) {
      return value
        .filter(
          (item) =>
            item !==
            undefined
        )
        .map(
          stripUndefined
        );
    }

    if (
      value &&
      typeof value ===
        'object' &&
      !(value instanceof Date)
    ) {
      return Object.fromEntries(
        Object.entries(
          value as Record<
            string,
            unknown
          >
        )
          .filter(
            ([, item]) =>
              item !==
              undefined
          )
          .map(
            ([key, item]) => [
              key,
              stripUndefined(
                item
              ),
            ]
          )
      );
    }

    return value;
  };

class AdminAuditService {
  async log(
    entry: AdminAuditLog
  ) {
    const safeEntry =
      stripUndefined(
        entry
      ) as AdminAuditLog;

    await addDoc(
      collection(
        db,
        'admin_audit_logs'
      ),
      {
        ...safeEntry,

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
        id:
          document.id,
        ...document.data(),
      })
    );
  }
}

export const adminAuditService =
  new AdminAuditService();
