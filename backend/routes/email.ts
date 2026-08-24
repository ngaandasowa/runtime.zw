import {
  Router,
} from 'express';

import {
  emailService,
} from '../email/emailService';

const router =
  Router();

router.post(
  '/order-created',

  async (
    req,
    res
  ) => {
    try {
      const {
        email,
        name,
        orderReference,
        domainName,
        amount,
      } =
        req.body ?? {};

      if (
        !email ||
        !name ||
        !orderReference ||
        !domainName ||
        typeof amount !==
          'number'
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Invalid email payload.',
          });
      }

      await emailService
        .sendOrderCreated({
          email,
          name,
          orderReference,
          domainName,
          amount,
        });

      return res.json({
        success:
          true,
      });
    } catch (error) {
      console.error(
        'Order email failed:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            'Unable to send email.',
        });
    }
  }
);

export default router;