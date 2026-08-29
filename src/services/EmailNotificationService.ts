import {
  getAuth,
} from 'firebase/auth';

export type EmailNotificationEvent =
  | 'domain_order_created'
  | 'renewal_order_created'
  | 'order_cancelled'
  | 'payment_approved'
  | 'payment_rejected'
  | 'renewal_completed'
  | 'domain_activated'
  | 'domain_assigned'
  | 'domain_replaced'
  | 'nameserver_change_requested'
  | 'domain_modify_requested'
  | 'domain_delete_requested'
  | 'domain_transfer_requested'
  | 'wallet_credit_added'
  | 'runtime_credit_applied';

export type EmailNotificationPayload = {
  email: string;
  name?: string;
  orderReference?: string;
  paymentReference?: string;
  domainName?: string;
  originalDomainName?: string;
  replacementDomainName?: string;
  additionalCharge?: number;
  amount?: number;
  creditApplied?: number;
  orderTotal?: number;
  amountPaid?: number;
  amountRemaining?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  years?: number;
  renewalDate?: string;
  registeredAt?: string;
  reason?: string;
  nameservers?: string[];
};

const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : '');

class EmailNotificationService {
  async notify(
    event:
      EmailNotificationEvent,
    data:
      EmailNotificationPayload
  ): Promise<void> {
    const user =
      getAuth()
        .currentUser;

    if (!user) {
      throw new Error(
        'Email notification requires an authenticated user.'
      );
    }

    const token =
      await user
        .getIdToken();

    const response =
      await fetch(
        `${API_BASE_URL}/api/email/notify`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body:
            JSON.stringify({
              event,
              data,
            }),
        }
      );

    if (
      !response.ok
    ) {
      let message =
        `Email notification failed (${response.status}).`;

      try {
        const body =
          await response.json();

        if (
          body?.message
        ) {
          message =
            String(
              body.message
            );
        }
      } catch {
        // Ignore invalid JSON error bodies.
      }

      throw new Error(
        message
      );
    }
  }

  notifyQuietly(
    event:
      EmailNotificationEvent,
    data:
      EmailNotificationPayload
  ): void {
    void this
      .notify(
        event,
        data
      )
      .catch(
        (error) => {
          console.error(
            `Email event "${event}" failed:`,
            error
          );
        }
      );
  }
}

export const emailNotificationService =
  new EmailNotificationService();
