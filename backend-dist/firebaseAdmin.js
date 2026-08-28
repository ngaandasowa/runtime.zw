import { cert, getApps, initializeApp, } from 'firebase-admin/app';
import { getAuth, } from 'firebase-admin/auth';
import { getFirestore, } from 'firebase-admin/firestore';
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing');
}
const serviceAccount = JSON.parse(serviceAccountJson);
if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}
export const adminAuth = getAuth();
export const adminDb = getFirestore();
