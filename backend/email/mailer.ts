import { Resend } from 'resend';

const apiKey =
  process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error(
    'RESEND_API_KEY environment variable is missing'
  );
}

const resend =
  new Resend(apiKey);

export const sendMail =
  async ({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) => {
    const fromName =
      process.env.MAIL_FROM_NAME ||
      'Runtime';

    const fromEmail =
      process.env.MAIL_FROM_EMAIL ||
      'notifications@runtime.co.zw';

    const {
      data,
      error,
    } =
      await resend.emails.send({
        from:
          `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      });

    if (error) {
      console.error(
        'Resend email error:',
        error
      );

      throw new Error(
        error.message ||
        'Unable to send email through Resend'
      );
    }

    console.log(
      'Email sent through Resend:',
      data?.id
    );

    return data;
  };