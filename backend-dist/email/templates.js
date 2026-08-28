const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
const money = (value) => typeof value === 'number'
    ? `$${value.toFixed(2)} USD`
    : undefined;
const dateText = (value) => {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed
        .toLocaleDateString('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};
const row = (label, value) => {
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
const layout = ({ title, intro, data, note, }) => {
    const safeName = escapeHtml(data.name?.trim() ||
        'there');
    const nsText = data.nameservers?.length
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
                      ${row('Domain', data.domainName)}

                      ${row('Order', data.orderReference)}

                      ${row('Payment', data.paymentReference)}

                      ${row('Amount', money(data.amount))}

                      ${row('Period', data.years
        ? `${data.years} ${data.years === 1
            ? 'year'
            : 'years'}`
        : undefined)}

                      ${row('Registered', dateText(data.registeredAt))}

                      ${row('Next renewal', dateText(data.renewalDate))}

                      ${row('Nameservers', nsText)}

                      ${row('Reason', data.reason)}
                    </table>

                    ${note
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
        : ''}

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
const customerContent = (event) => {
    switch (event) {
        case 'domain_order_created':
            return {
                subject: (data) => `Order ${data.orderReference || ''} received`.trim(),
                title: 'Your domain order has been created',
                intro: 'we received your domain order.',
                note: 'Complete the payment shown in your Runtime account. Registration starts after payment is verified.',
            };
        case 'renewal_order_created':
            return {
                subject: (data) => `Renewal order ${data.orderReference || ''} created`.trim(),
                title: 'Your renewal order has been created',
                intro: 'your domain renewal order is ready for payment.',
                note: 'Your current expiry date will only be extended after payment is verified.',
            };
        case 'order_cancelled':
            return {
                subject: (data) => `Order ${data.orderReference || ''} cancelled`.trim(),
                title: 'Your order has been cancelled',
                intro: 'the order below has been cancelled.',
            };
        case 'payment_approved':
            return {
                subject: () => 'Payment verified',
                title: 'Your payment has been verified',
                intro: 'we verified your payment. Domain processing can now continue.',
            };
        case 'payment_rejected':
            return {
                subject: () => 'Payment could not be verified',
                title: 'Your payment needs attention',
                intro: 'we could not verify the submitted payment.',
                note: 'Please check the reason above and contact Runtime if you need assistance.',
            };
        case 'renewal_completed':
            return {
                subject: (data) => `${data.domainName} renewed`,
                title: 'Your domain has been renewed',
                intro: 'your renewal is complete.',
            };
        case 'domain_activated':
            return {
                subject: (data) => `${data.domainName} is now active`,
                title: 'Your domain is active',
                intro: 'your domain registration has been completed.',
            };
        case 'domain_assigned':
            return {
                subject: (data) => `${data.domainName} added to your account`,
                title: 'A domain has been added to your account',
                intro: 'Runtime has assigned the domain below to your account.',
            };
        case 'nameserver_change_requested':
            return {
                subject: (data) => `Nameserver request received for ${data.domainName}`,
                title: 'Nameserver change request received',
                intro: 'we received your nameserver change request.',
                note: 'The requested nameservers will be processed according to the domain registry workflow.',
            };
        case 'domain_modify_requested':
            return {
                subject: (data) => `Domain update received for ${data.domainName}`,
                title: 'Domain details update received',
                intro: 'we received your domain details update request.',
            };
        case 'domain_delete_requested':
            return {
                subject: (data) => `Cancellation request received for ${data.domainName}`,
                title: 'Domain cancellation request received',
                intro: 'we received your request to cancel this domain.',
                note: 'The domain is not considered cancelled until the cancellation process is completed.',
            };
        case 'domain_transfer_requested':
            return {
                subject: (data) => `Transfer request received for ${data.domainName}`,
                title: 'Domain transfer request received',
                intro: 'we received your domain transfer request.',
                note: 'Runtime will process the transfer and update the domain status when the next step is completed.',
            };
    }
};
export const buildCustomerEmail = (event, data) => {
    const content = customerContent(event);
    return {
        subject: content.subject(data),
        html: layout({
            title: content.title,
            intro: content.intro,
            data,
            note: content.note,
        }),
    };
};
const adminEvents = new Set([
    'domain_order_created',
    'renewal_order_created',
    'order_cancelled',
    'nameserver_change_requested',
    'domain_modify_requested',
    'domain_delete_requested',
    'domain_transfer_requested',
]);
export const buildAdminEmail = (event, data) => {
    if (!adminEvents.has(event)) {
        return null;
    }
    const eventLabel = event
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
    return {
        subject: `[Runtime] ${eventLabel}: ${data.domainName}`,
        html: layout({
            title: eventLabel,
            intro: `a customer action requires visibility in Runtime. Customer: ${data.email}.`,
            data: {
                ...data,
                name: 'Runtime Admin',
            },
        }),
    };
};
