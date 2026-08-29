import { getAuth } from 'firebase/auth';

export async function testWallet() {
  const auth = getAuth();

  if (!auth.currentUser) {
    console.error('No Firebase user is signed in.');
    return;
  }

  const token =
    await auth.currentUser.getIdToken();

  const API =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:4000';

  const walletResponse = await fetch(
  `${API}/api/wallet/me`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const walletText =
  await walletResponse.text();

console.log(
  'WALLET STATUS:',
  walletResponse.status
);

console.log(
  'WALLET RESPONSE:',
  walletText
);

  const transactionsResponse =
    await fetch(
      `${API}/api/wallet/transactions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

  console.log(
    'TRANSACTIONS:',
    await transactionsResponse.json()
  );
}