import 'dotenv/config';
import express from 'express';

import emailRoutes from './routes/email';

const app =
  express();

app.use(
  express.json()
);

app.use(
  '/api/email',
  emailRoutes
);

const PORT =
  Number(
    process.env.PORT ||
      4000
  );

app.listen(
  PORT,
  () => {
    console.log(
      `Runtime backend running on port ${PORT}`
    );
  }
);