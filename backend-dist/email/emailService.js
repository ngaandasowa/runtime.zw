import { sendMail, } from './mailer.js';
import { buildAdminEmail, buildCustomerEmail, } from './templates.js';
class EmailService {
    async sendEvent(event, data) {
        const customer = buildCustomerEmail(event, data);
        await sendMail({
            to: data.email,
            subject: customer.subject,
            html: customer.html,
        });
        const admin = buildAdminEmail(event, data);
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        if (admin &&
            adminEmail) {
            await sendMail({
                to: adminEmail,
                subject: admin.subject,
                html: admin.html,
            });
        }
    }
}
export const emailService = new EmailService();
