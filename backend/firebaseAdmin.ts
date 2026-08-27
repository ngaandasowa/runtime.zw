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

import {
  readFileSync,
} from 'node:fs';

import {
  fileURLToPath,
} from 'node:url';

const serviceAccountPath =
  fileURLToPath(
    new URL(
      './firebase-service-account.json',
      import.meta.url
    )
  );

const serviceAccount =
  JSON.parse(
    readFileSync(
      serviceAccountPath,
      'utf8'
    )
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
}

export const adminAuth =
  getAuth();

export const adminDb =
  getFirestore();