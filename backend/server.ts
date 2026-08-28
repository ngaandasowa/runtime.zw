import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import emailRoutes from './routes/email.js';

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

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      /*
       * Allow requests without an Origin header,
       * such as server-to-server requests.
       */
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      console.error(
        `CORS blocked origin: ${origin}`
      );

      return callback(
        new Error(
          `Origin not allowed: ${origin}`
        )
      );
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
  })
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
 * ERROR HANDLER
 * ----------------------------------------------------------
 */

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(
      'Runtime API error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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
  '0.0.0.0',
  () => {
    console.log(
      `Runtime backend running on port ${PORT}`
    );
  }
);