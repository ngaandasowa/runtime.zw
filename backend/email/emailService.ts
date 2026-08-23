import { sendMail } from './mailer';

export const emailService = {
  async sendOrderCreated(data: {
    email: string;
    name: string;
    orderReference: string;
    domainName: string;
    amount: number;
  }) {
    await sendMail({
      to: data.email,

      subject:
        `Order ${data.orderReference} received`,

      html: `
        <h2>Your Runtime order has been created</h2>

        <p>Hi ${data.name},</p>

        <p>
          We have received your order for
          <strong>${data.domainName}</strong>.
        </p>

        <p>
          Order: <strong>${data.orderReference}</strong><br />
          Amount: <strong>$${data.amount.toFixed(2)} USD</strong>
        </p>

        <p>
          Pay via EcoCash USD:
        </p>

        <p>
          <strong>0783827570</strong><br />
          Ngaavongwe Ndasowampange
        </p>

        <p>
          After payment, send your screenshot to Runtime on WhatsApp.
          Registration will begin after payment is verified.
        </p>
      `,
    });
  },

  async sendPaymentApproved(data: {
    email: string;
    name: string;
    orderReference: string;
    domainName: string;
    amount: number;
  }) {
    await sendMail({
      to: data.email,

      subject:
        `Payment confirmed for ${data.domainName}`,

      html: `
        <h2>Payment confirmed</h2>

        <p>Hi ${data.name},</p>

        <p>
          We have confirmed your payment of
          <strong>$${data.amount.toFixed(2)} USD</strong>
          for <strong>${data.domainName}</strong>.
        </p>

        <p>
          Order: <strong>${data.orderReference}</strong>
        </p>

        <p>
          Your domain is now being processed.
        </p>
      `,
    });
  },

  async sendPaymentRejected(data: {
    email: string;
    name: string;
    orderReference: string;
    domainName: string;
    reason?: string;
  }) {
    await sendMail({
      to: data.email,

      subject:
        `Payment could not be verified`,

      html: `
        <h2>Payment verification update</h2>

        <p>Hi ${data.name},</p>

        <p>
          We could not verify the payment for
          <strong>${data.domainName}</strong>.
        </p>

        <p>
          Order: <strong>${data.orderReference}</strong>
        </p>

        ${
          data.reason
            ? `<p>Reason: ${data.reason}</p>`
            : ''
        }

        <p>
          Please contact Runtime if you believe this is incorrect.
        </p>
      `,
    });
  },
};