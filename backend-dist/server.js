import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// Initialize Firebase Admin SDK before anything else
import './firebaseAdmin.js';
import emailRoutes from './routes/email.js';
import paymentRoutes from './routes/payments.js';
import walletRoutes from './routes/wallet.js';
import emailCampaignRoutes from './routes/emailCampaigns.js';
import renewalLifecycleRoutes from './routes/renewalLifecycle.js';
import nameserverRoutes from './routes/nameservers.js';
import analyticsRoutes from './routes/analytics.js';
import adminUserRoutes from './routes/adminUsers.js';
import authValidationRoutes from './routes/authValidation.js';
const app = express();
/*
 * ----------------------------------------------------------
 * CORS
 * ----------------------------------------------------------
 */
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://runtime.co.zw',
    'https://www.runtime.co.zw',
];
app.use(cors({
    origin: (origin, callback) => {
        /*
         * Allow requests without an Origin header,
         * such as server-to-server requests.
         */
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.error(`CORS blocked origin: ${origin}`);
        return callback(new Error(`Origin not allowed: ${origin}`));
    },
    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
    ],
    credentials: true,
}));
/*
 * ----------------------------------------------------------
 * JSON
 * ----------------------------------------------------------
 */
app.use(express.json());
/*
 * ----------------------------------------------------------
 * HEALTH CHECK
 * ----------------------------------------------------------
 */
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Runtime API',
    });
});
/*
 * ----------------------------------------------------------
 * API ROUTES
 * ----------------------------------------------------------
 */
app.use('/api/email', emailRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/email-campaigns', emailCampaignRoutes);
app.use('/api/renewals', renewalLifecycleRoutes);
app.use('/api/nameservers', nameserverRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/auth', authValidationRoutes);
/*
 * ----------------------------------------------------------
 * ERROR HANDLER
 * ----------------------------------------------------------
 */
app.use((error, _req, res, _next) => {
    console.error('Runtime API error:', error);
    res.status(500).json({
        success: false,
        message: error.message,
    });
});
/*
 * ----------------------------------------------------------
 * SERVER
 * ----------------------------------------------------------
 */
const PORT = Number(process.env.PORT ||
    4000);
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Runtime backend running on port ${PORT}`);
});
