export type EmailEvent =
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

export type EmailEventData = {
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

export type BuiltEmail = {
  subject: string;
  html: string;
};

const escapeHtml = (
  value: string
) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const money = (
  value?: number
) =>
  typeof value === 'number'
    ? `$${value.toFixed(2)} USD`
    : undefined;

const dateText = (
  value?: string
) => {
  if (!value) {
    return undefined;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed
    .toLocaleDateString(
      'en',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
};

const row = (
  label: string,
  value?: string
) => {
  if (!value) {
    return '';
  }

  return `
    <tr>
      <td style="
        padding:11px 14px;
        border-top:1px solid #f4f4f5;
        color:#71717a;
        font-size:12px;
      ">
        ${escapeHtml(label)}
      </td>

      <td
        align="right"
        style="
          padding:11px 14px;
          border-top:1px solid #f4f4f5;
          color:#18181b;
          font-size:13px;
          font-weight:700;
        "
      >
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
};

const layout = ({
  title,
  intro,
  data,
  note,
}: {
  title: string;
  intro: string;
  data: EmailEventData;
  note?: string;
}) => {
  const safeName =
    escapeHtml(
      data.name?.trim() ||
      'there'
    );

  const nsText =
    data.nameservers?.length
      ? data.nameservers.join(', ')
      : undefined;

  return `
    <!doctype html>
    <html>
      <body style="
        margin:0;
        padding:0;
        background:#f7f7f8;
        font-family:Arial,Helvetica,sans-serif;
        color:#18181b;
      ">
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="padding:32px 16px;"
        >
          <tr>
            <td align="center">
              <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width:600px;
                  background:#ffffff;
                  border:1px solid #e4e4e7;
                "
              >
                <tr>
                  <td style="padding:28px 28px 18px;">
                    <div style="
                      font-size:20px;
                      font-weight:700;
                      color:#3120ff;
                    ">
                      Runtime
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px 28px;">
                    <h1 style="
                      margin:0;
                      font-size:23px;
                      line-height:1.3;
                    ">
                      ${escapeHtml(title)}
                    </h1>

                    <p style="
                      margin:16px 0 0;
                      font-size:14px;
                      line-height:1.7;
                      color:#52525b;
                    ">
                      Hi ${safeName}, ${escapeHtml(intro)}
                    </p>

                    <table
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        margin-top:24px;
                        border:1px solid #e4e4e7;
                      "
                    >
                      ${row(
                        'Domain',
                        data.domainName
                      )}

                      ${row(
                        'Original domain',
                        data.originalDomainName
                      )}

                      ${row(
                        'Replacement domain',
                        data.replacementDomainName
                      )}

                      ${row(
                        'Additional charge',
                        money(data.additionalCharge)
                      )}

                      ${row(
                        'Order',
                        data.orderReference
                      )}

                      ${row(
                        'Payment',
                        data.paymentReference
                      )}

                      ${row(
                        'Amount',
                        money(data.amount)
                      )}

                      ${row(
                        'Runtime Credit applied',
                        money(data.creditApplied)
                      )}

                      ${row(
                        'Order total',
                        money(data.orderTotal)
                      )}

                      ${row(
                        'Paid so far',
                        money(data.amountPaid)
                      )}

                      ${row(
                        'Remaining to pay',
                        money(data.amountRemaining)
                      )}

                      ${row(
                        'Credit balance before',
                        money(data.balanceBefore)
                      )}

                      ${row(
                        'Credit balance after',
                        money(data.balanceAfter)
                      )}

                      ${row(
                        'Period',
                        data.years
                          ? `${data.years} ${
                              data.years === 1
                                ? 'year'
                                : 'years'
                            }`
                          : undefined
                      )}

                      ${row(
                        'Registered',
                        dateText(
                          data.registeredAt
                        )
                      )}

                      ${row(
                        'Next renewal',
                        dateText(
                          data.renewalDate
                        )
                      )}

                      ${row(
                        'Nameservers',
                        nsText
                      )}

                      ${row(
                        'Reason',
                        data.reason
                      )}
                    </table>

                    ${
                      note
                        ? `
                          <p style="
                            margin:20px 0 0;
                            font-size:13px;
                            line-height:1.7;
                            color:#52525b;
                          ">
                            ${escapeHtml(note)}
                          </p>
                        `
                        : ''
                    }

                    <p style="
                      margin:22px 0 0;
                      font-size:12px;
                      line-height:1.7;
                      color:#a1a1aa;
                    ">
                      If you did not request this action, contact Runtime support.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="
                    border-top:1px solid #e4e4e7;
                    padding:18px 28px;
                    font-size:11px;
                    color:#a1a1aa;
                  ">
                    Runtime
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const customerContent = (
  event: EmailEvent
): {
  subject: (
    data: EmailEventData
  ) => string;
  title: string;
  intro: string;
  note?:
    | string
    | ((
        data: EmailEventData
      ) => string);
} => {
  switch (event) {
    case 'domain_order_created':
      return {
        subject: (data) =>
          `Order ${data.orderReference || ''} received`.trim(),
        title:
          'Your domain order has been created',
        intro:
          'we received your domain order.',
        note:
          'Complete the payment shown in your Runtime account. Registration starts after payment is verified.',
      };

    case 'renewal_order_created':
      return {
        subject: (data) =>
          `Renewal order ${data.orderReference || ''} created`.trim(),
        title:
          'Your renewal order has been created',
        intro:
          'your domain renewal order is ready for payment.',
        note:
          'Your current expiry date will only be extended after payment is verified.',
      };

    case 'order_cancelled':
      return {
        subject: (data) =>
          `Order ${data.orderReference || ''} cancelled`.trim(),
        title:
          'Your order has been cancelled',
        intro:
          'the order below has been cancelled.',
      };

    case 'payment_approved':
      return {
        subject: () =>
          'Payment verified',
        title:
          'Your payment has been verified',
        intro:
          'we verified your payment. Domain processing can now continue.',
      };

    case 'payment_rejected':
      return {
        subject: () =>
          'Payment could not be verified',
        title:
          'Your payment needs attention',
        intro:
          'we could not verify the submitted payment.',
        note:
          'Please check the reason above and contact Runtime if you need assistance.',
      };

    case 'renewal_completed':
      return {
        subject: (data) =>
          `${data.domainName} renewed`,
        title:
          'Your domain has been renewed',
        intro:
          'your renewal is complete.',
      };

    case 'domain_activated':
      return {
        subject: (data) =>
          `${data.domainName} is now active`,
        title:
          'Your domain is active',
        intro:
          'your domain registration has been completed.',
      };

    case 'domain_assigned':
      return {
        subject: (data) =>
          `${data.domainName} added to your account`,
        title:
          'A domain has been added to your account',
        intro:
          'Runtime has assigned the domain below to your account.',
      };

    case 'domain_replaced':
      return {
        subject: (data) =>
          `${data.replacementDomainName || data.domainName || 'Your domain'} has replaced the original domain`,
        title:
          'Your domain has been replaced',
        intro:
          'the original domain could not be registered, so Runtime has applied your existing paid order to the replacement domain below.',
        note:
          'You do not need to make another payment. Your existing verified payment was reused and the additional charge is $0.00 USD.',
      };

    case 'nameserver_change_requested':
      return {
        subject: (data) =>
          `Nameserver request received for ${data.domainName}`,
        title:
          'Nameserver change request received',
        intro:
          'we received your nameserver change request.',
        note:
          'The requested nameservers will be processed according to the domain registry workflow.',
      };

    case 'domain_modify_requested':
      return {
        subject: (data) =>
          `Domain update received for ${data.domainName}`,
        title:
          'Domain details update received',
        intro:
          'we received your domain details update request.',
      };

    case 'domain_delete_requested':
      return {
        subject: (data) =>
          `Cancellation request received for ${data.domainName}`,
        title:
          'Domain cancellation request received',
        intro:
          'we received your request to cancel this domain.',
        note:
          'The domain is not considered cancelled until the cancellation process is completed.',
      };

    case 'domain_transfer_requested':
      return {
        subject: (data) =>
          `Transfer request received for ${data.domainName}`,
        title:
          'Domain transfer request received',
        intro:
          'we received your domain transfer request.',
        note:
          'Runtime will process the transfer and update the domain status when the next step is completed.',
      };

    case 'wallet_credit_added':
      return {
        subject: (data) =>
          `Runtime Credit added${typeof data.amount === 'number' ? `: $${data.amount.toFixed(2)}` : ''}`,
        title:
          'Runtime Credit added',
        intro:
          'your Runtime Credit top-up has been confirmed and added to your account.',
        note:
          (data) =>
            typeof data.balanceAfter === 'number'
              ? `Your available Runtime Credit balance is now $${data.balanceAfter.toFixed(2)} USD.`
              : 'Your Runtime Credit balance has been updated.',
      };

    case 'runtime_credit_applied':
      return {
        subject: (data) =>
          `Runtime Credit applied${data.orderReference ? ` to ${data.orderReference}` : ''}`,
        title:
          'Runtime Credit applied to your order',
        intro:
          'we applied Runtime Credit to your order.',
        note:
          (data) =>
            typeof data.amountRemaining === 'number' &&
            data.amountRemaining > 0
              ? `$${data.amountRemaining.toFixed(2)} USD remains on this order. Sign in to Runtime to complete the remaining payment.`
              : 'Your order has no remaining balance from this payment step.',
      };
  }
};

export const buildCustomerEmail = (
  event: EmailEvent,
  data: EmailEventData
): BuiltEmail => {
  const content =
    customerContent(event);

  const resolvedNote =
    typeof content.note ===
    'function'
      ? content.note(data)
      : content.note;

  return {
    subject:
      content.subject(data),

    html:
      layout({
        title:
          content.title,
        intro:
          content.intro,
        data,
        note:
          resolvedNote,
      }),
  };
};

const adminEvents =
  new Set<EmailEvent>([
    'domain_order_created',
    'renewal_order_created',
    'order_cancelled',
    'nameserver_change_requested',
    'domain_modify_requested',
    'domain_delete_requested',
    'domain_transfer_requested',
  ]);

export const buildAdminEmail = (
  event: EmailEvent,
  data: EmailEventData
): BuiltEmail | null => {
  if (
    !adminEvents.has(event)
  ) {
    return null;
  }

  const eventLabel =
    event
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );

  return {
    subject:
      `[Runtime] ${eventLabel}: ${data.domainName}`,

    html:
      layout({
        title:
          eventLabel,
        intro:
          `a customer action requires visibility in Runtime. Customer: ${data.email}.`,
        data: {
          ...data,
          name:
            'Runtime Admin',
        },
      }),
  };
};