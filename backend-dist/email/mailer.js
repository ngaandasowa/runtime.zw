import nodemailer from 'nodemailer';
export const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ||
        465),
    secure: process.env.SMTP_SECURE ===
        'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
export const sendMail = async ({ to, subject, html, }) => {
    await mailer.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'Runtime'}" <${process.env.MAIL_FROM_EMAIL}>`,
        to,
        subject,
        html,
    });
};
