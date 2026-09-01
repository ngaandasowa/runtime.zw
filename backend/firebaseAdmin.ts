import fs from 'fs';
import path from 'path';
import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import {
  getAuth,
} from 'firebase-admin/auth';

import {
  getFirestore,
} from 'firebase-admin/firestore';

let serviceAccountJson =
  process.env.FIREBASE_SERVICE_ACCOUNT;

// If env var not set, try to read from file (for local development)
if (!serviceAccountJson) {
  try {
    const filePath = path.join(
      process.cwd(),
      'backend',
      'firebase-service-account.json'
    );

    const fileContent =
      fs.readFileSync(
        filePath,
        'utf-8'
      );

    serviceAccountJson = fileContent;
    console.log(
      '✅ Loaded Firebase service account from file'
    );
  } catch (error) {
    console.warn(
      'Could not load Firebase service account from file:',
      error instanceof Error
        ? error.message
        : error
    );
  }
}

if (!serviceAccountJson) {
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT environment variable is missing and firebase-service-account.json file not found'
  );
}

const serviceAccount =
  JSON.parse(
    serviceAccountJson
  );

if (
  getApps().length === 0
) {
  initializeApp({
    credential:
      cert(
        serviceAccount
      ),
  });

  console.log(
    '✅ Firebase Admin SDK initialized'
  );
}

export const adminAuth =
  getAuth();

export const adminDb =
  getFirestore();