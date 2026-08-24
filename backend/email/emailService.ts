import {
  sendMail,
} from './mailer';

import {
  orderCreatedTemplate,
} from './templates';

type OrderCreatedEmailData = {
  email: string;
  name: string;
  orderReference: string;
  domainName: string;
  amount: number;
};

class EmailService {
  async sendOrderCreated(
    data: OrderCreatedEmailData
  ) {
    const html =
      orderCreatedTemplate({
        name: data.name,
        orderReference:
          data.orderReference,
        domainName:
          data.domainName,
        amount:
          data.amount,
      });

    await sendMail({
      to: data.email,

      subject:
        `Order ${data.orderReference} received`,

      html,
    });
  }
}

export const emailService =
  new EmailService();