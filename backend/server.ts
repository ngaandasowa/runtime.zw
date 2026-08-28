import 'dotenv/config';

import express from 'express';

import emailRoutes from './routes/email.js';

const app =
  express();


/*
 * ----------------------------------------------------------
 * CORS
 * ----------------------------------------------------------
 *
 * Allows the Runtime frontend to call the backend.
 */
app.use(
  (
    req,
    res,
    next
  ) => {
    const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://runtime.co.zw',
  'https://www.runtime.co.zw',
];

    const origin =
      req.headers.origin;

    if (
      origin &&
      allowedOrigins.includes(
        origin
      )
    ) {
      res.setHeader(
        'Access-Control-Allow-Origin',
        origin
      );
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );

    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    res.setHeader(
      'Access-Control-Allow-Credentials',
      'true'
    );

    /*
     * Browser preflight request.
     */
    if (
      req.method ===
      'OPTIONS'
    ) {
      return res
        .status(204)
        .end();
    }

    next();
  }
);


/*
 * ----------------------------------------------------------
 * JSON
 * ----------------------------------------------------------
 */

app.use(
  express.json()
);

/*
 * ----------------------------------------------------------
 * HEALTH CHECK
 * ----------------------------------------------------------
 */

app.get(
  '/',
  (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Runtime API',
    });
  }
);

/*
 * ----------------------------------------------------------
 * EMAIL API
 * ----------------------------------------------------------
 */

app.use(
  '/api/email',
  emailRoutes
);


/*
 * ----------------------------------------------------------
 * SERVER
 * ----------------------------------------------------------
 */

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