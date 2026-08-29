import {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';

import {
  adminAuth,
  adminDb,
} from '../firebaseAdmin.js';

import {
  sendMail,
} from '../email/mailer.js';

type RuntimeUser = {
  uid: string;
  email: string;
  role: string;
};

type AuthenticatedRequest =
  Request & {
    runtimeUser?: RuntimeUser;
  };

type CampaignStatus =
  | 'draft'
  | 'sending'
  | 'paused'
  | 'completed';

type RecipientStatus =
  | 'queued'
  | 'sent'
  | 'failed'
  | 'skipped';

const router = Router();

const authenticate =
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const header =
        req.headers.authorization;

      if (
        !header?.startsWith(
          'Bearer '
        )
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              'Authentication required.',
          });
      }

      const decoded =
        await adminAuth
          .verifyIdToken(
            header.slice(7)
          );

      const profile =
        await adminDb
          .collection('users')
          .doc(decoded.uid)
          .get();

      const role =
        profile.exists
          ? String(
              profile.data()
                ?.role ||
              'customer'
            )
          : 'customer';

      req.runtimeUser = {
        uid:
          decoded.uid,
        email:
          decoded.email || '',
        role,
      };

      next();
    } catch (error) {
      console.error(
        'Campaign authentication failed:',
        error
      );

      return res
        .status(401)
        .json({
          success: false,
          message:
            'Invalid authentication token.',
        });
    }
  };

const requireSuperAdmin =
  (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (
      req.runtimeUser?.role !==
      'super_admin'
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            'Super administrator permission required.',
        });
    }

    next();
  };

const escapeHtml = (
  value: string
) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const paragraphHtml = (
  value: string
) =>
  value
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.75;color:#52525b;">${escapeHtml(
          paragraph.trim()
        ).replace(/\n/g, '<br>')}</p>`
    )
    .join('');

const buildCampaignHtml = ({
  name,
  title,
  message,
  ctaLabel,
  ctaUrl,
}: {
  name?: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const safeName =
    escapeHtml(
      name?.trim() ||
      'there'
    );

  const button =
    ctaLabel &&
    ctaUrl
      ? `
        <p style="margin:24px 0 0;">
          <a
            href="${escapeHtml(ctaUrl)}"
            style="
              display:inline-block;
              background:#3120ff;
              color:#ffffff;
              text-decoration:none;
              padding:12px 18px;
              font-size:13px;
              font-weight:700;
            "
          >
            ${escapeHtml(ctaLabel)}
          </a>
        </p>
      `
      : '';

  return `
    <!doctype html>
    <html>
      <body style="
        margin:0;
        padding:0;
        background:#f7f7f8;
        font-family:Arial,Helvetica,sans-serif;
        color:#18181b;
      ">
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="padding:32px 16px;"
        >
          <tr>
            <td align="center">
              <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width:600px;
                  background:#ffffff;
                  border:1px solid #e4e4e7;
                "
              >
                <tr>
                  <td style="padding:28px 28px 18px;">
                    <img
                      src="https://runtime.co.zw/runtime-logo.png"
                      alt="Runtime"
                      width="140"
                      style="
                        display:block;
                        width:140px;
                        max-width:100%;
                        height:auto;
                        border:0;
                        outline:none;
                        text-decoration:none;
                      "
                    >
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px 30px;">
                    <h1 style="
                      margin:0;
                      font-size:23px;
                      line-height:1.3;
                    ">
                      ${escapeHtml(title)}
                    </h1>

                    <p style="
                      margin:16px 0;
                      font-size:14px;
                      line-height:1.75;
                      color:#52525b;
                    ">
                      Hi ${safeName},
                    </p>

                    ${paragraphHtml(message)}
                    ${button}
                  </td>
                </tr>

                <tr>
                  <td style="
                    border-top:1px solid #e4e4e7;
                    padding:18px 28px;
                    font-size:11px;
                    line-height:1.6;
                    color:#a1a1aa;
                  ">
                    Runtime<br>
                    You received this email because you have a Runtime account.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const campaignCounts =
  async (
    campaignId: string
  ) => {
    const snapshot =
      await adminDb
        .collection(
          'email_campaign_recipients'
        )
        .where(
          'campaign_id',
          '==',
          campaignId
        )
        .get();

    const counts = {
      total:
        snapshot.size,
      queued: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    snapshot.docs.forEach(
      (doc) => {
        const status =
          String(
            doc.data()
              ?.status ||
            'queued'
          ) as RecipientStatus;

        if (
          status in counts
        ) {
          (
            counts as Record<
              string,
              number
            >
          )[status] += 1;
        }
      }
    );

    return counts;
  };

router.get(
  '/',
  authenticate,
  requireSuperAdmin,
  async (_req, res) => {
    try {
      const snapshot =
        await adminDb
          .collection(
            'email_campaigns'
          )
          .get();

      const campaigns =
        await Promise.all(
          snapshot.docs.map(
            async (doc) => ({
              id: doc.id,
              ...doc.data(),
              counts:
                await campaignCounts(
                  doc.id
                ),
            })
          )
        );

      campaigns.sort(
        (a: any, b: any) =>
          String(
            b.created_at || ''
          ).localeCompare(
            String(
              a.created_at || ''
            )
          )
      );

      return res.json({
        success: true,
        campaigns,
      });
    } catch (error) {
      console.error(
        'List campaigns failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to load email campaigns.',
        });
    }
  }
);

router.get(
  '/:campaignId/recipients',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const snapshot =
        await adminDb
          .collection(
            'email_campaign_recipients'
          )
          .where(
            'campaign_id',
            '==',
            req.params.campaignId
          )
          .get();

      const recipients =
        snapshot.docs
          .map(
            (doc) => ({
              id: doc.id,
              ...doc.data(),
            })
          )
          .sort(
            (a: any, b: any) =>
              String(
                a.email || ''
              ).localeCompare(
                String(
                  b.email || ''
                )
              )
          );

      return res.json({
        success: true,
        recipients,
      });
    } catch (error) {
      console.error(
        'Load campaign recipients failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to load campaign recipients.',
        });
    }
  }
);

router.post(
  '/',
  authenticate,
  requireSuperAdmin,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const subject =
        String(
          req.body?.subject ||
          ''
        ).trim();

      const title =
        String(
          req.body?.title ||
          ''
        ).trim();

      const message =
        String(
          req.body?.message ||
          ''
        ).trim();

      const ctaLabel =
        String(
          req.body?.ctaLabel ||
          ''
        ).trim();

      const ctaUrl =
        String(
          req.body?.ctaUrl ||
          ''
        ).trim();

      if (
        !subject ||
        !title ||
        !message
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Subject, heading and message are required.',
          });
      }

      if (
        Boolean(ctaLabel) !==
        Boolean(ctaUrl)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'CTA label and URL must be provided together.',
          });
      }

      if (
        ctaUrl &&
        !/^https?:\/\//i.test(
          ctaUrl
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'CTA URL must start with http:// or https://.',
          });
      }

      const usersSnapshot =
        await adminDb
          .collection('users')
          .get();

      const recipients =
        usersSnapshot.docs
          .map(
            (doc) => ({
              id: doc.id,
              ...doc.data(),
            })
          )
          .filter(
            (user: any) =>
              String(
                user.role ||
                'customer'
              ) ===
                'customer' &&
              typeof user.email ===
                'string' &&
              user.email.trim()
          );

      if (
        recipients.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'No eligible customer email addresses were found.',
          });
      }

      const now =
        new Date()
          .toISOString();

      const campaignRef =
        adminDb
          .collection(
            'email_campaigns'
          )
          .doc();

      const batch =
        adminDb.batch();

      batch.set(
        campaignRef,
        {
          subject,
          title,
          message,
          cta_label:
            ctaLabel || null,
          cta_url:
            ctaUrl || null,
          audience:
            'all_customers',
          status:
            'draft' as CampaignStatus,
          created_by:
            req.runtimeUser!.uid,
          created_by_email:
            req.runtimeUser!.email,
          created_at:
            now,
          updated_at:
            now,
        }
      );

      recipients.forEach(
        (user: any) => {
          const recipientRef =
            adminDb
              .collection(
                'email_campaign_recipients'
              )
              .doc(
                `${campaignRef.id}_${user.id}`
              );

          batch.set(
            recipientRef,
            {
              campaign_id:
                campaignRef.id,
              user_id:
                user.id,
              email:
                String(
                  user.email
                )
                  .trim()
                  .toLowerCase(),
              name:
                String(
                  user.name ||
                  user.full_name ||
                  ''
                ).trim(),
              status:
                'queued' as RecipientStatus,
              attempts: 0,
              last_error: null,
              sent_at: null,
              created_at:
                now,
              updated_at:
                now,
            }
          );
        }
      );

      await batch.commit();

      return res.json({
        success: true,
        campaignId:
          campaignRef.id,
        recipientCount:
          recipients.length,
      });
    } catch (error) {
      console.error(
        'Create campaign failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to create email campaign.',
        });
    }
  }
);


router.put(
  '/:campaignId',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const campaignRef =
        adminDb
          .collection(
            'email_campaigns'
          )
          .doc(
            req.params.campaignId
          );

      const campaignSnapshot =
        await campaignRef.get();

      if (!campaignSnapshot.exists) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Campaign not found.',
          });
      }

      if (
        campaignSnapshot.data()
          ?.status !==
        'draft'
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Only draft campaigns can be edited.',
          });
      }

      const subject =
        String(
          req.body?.subject ||
          ''
        ).trim();

      const title =
        String(
          req.body?.title ||
          ''
        ).trim();

      const message =
        String(
          req.body?.message ||
          ''
        ).trim();

      const ctaLabel =
        String(
          req.body?.ctaLabel ||
          ''
        ).trim();

      const ctaUrl =
        String(
          req.body?.ctaUrl ||
          ''
        ).trim();

      if (
        !subject ||
        !title ||
        !message
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Subject, heading and message are required.',
          });
      }

      if (
        Boolean(ctaLabel) !==
        Boolean(ctaUrl)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'CTA label and URL must be provided together.',
          });
      }

      if (
        ctaUrl &&
        !/^https?:\/\//i.test(
          ctaUrl
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'CTA URL must start with http:// or https://.',
          });
      }

      await campaignRef.set(
        {
          subject,
          title,
          message,
          cta_label:
            ctaLabel || null,
          cta_url:
            ctaUrl || null,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          merge: true,
        }
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        'Update campaign failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to update email campaign.',
        });
    }
  }
);

router.delete(
  '/:campaignId',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const campaignRef =
        adminDb
          .collection(
            'email_campaigns'
          )
          .doc(
            req.params.campaignId
          );

      const campaignSnapshot =
        await campaignRef.get();

      if (!campaignSnapshot.exists) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Campaign not found.',
          });
      }

      if (
        campaignSnapshot.data()
          ?.status !==
        'draft'
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Only draft campaigns can be deleted.',
          });
      }

      const recipientsSnapshot =
        await adminDb
          .collection(
            'email_campaign_recipients'
          )
          .where(
            'campaign_id',
            '==',
            req.params.campaignId
          )
          .get();

      const refs = [
        ...recipientsSnapshot.docs.map(
          (doc) => doc.ref
        ),
        campaignRef,
      ];

      /*
       * Firestore batched writes are limited.
       * Delete in conservative chunks.
       */
      for (
        let index = 0;
        index < refs.length;
        index += 400
      ) {
        const batch =
          adminDb.batch();

        refs
          .slice(
            index,
            index + 400
          )
          .forEach(
            (ref) =>
              batch.delete(ref)
          );

        await batch.commit();
      }

      return res.json({
        success: true,
        deletedRecipients:
          recipientsSnapshot.size,
      });
    } catch (error) {
      console.error(
        'Delete campaign failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to delete email campaign.',
        });
    }
  }
);

router.post(
  '/:campaignId/start',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const ref =
        adminDb
          .collection(
            'email_campaigns'
          )
          .doc(
            req.params.campaignId
          );

      const snapshot =
        await ref.get();

      if (!snapshot.exists) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Campaign not found.',
          });
      }

      await ref.set(
        {
          status: 'sending',
          started_at:
            snapshot.data()
              ?.started_at ||
            new Date()
              .toISOString(),
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          merge: true,
        }
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to start campaign.',
        });
    }
  }
);

router.post(
  '/:campaignId/pause',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      await adminDb
        .collection(
          'email_campaigns'
        )
        .doc(
          req.params.campaignId
        )
        .set(
          {
            status:
              'paused',
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            merge: true,
          }
        );

      return res.json({
        success: true,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to pause campaign.',
        });
    }
  }
);

router.post(
  '/:campaignId/retry-failed',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const snapshot =
        await adminDb
          .collection(
            'email_campaign_recipients'
          )
          .where(
            'campaign_id',
            '==',
            req.params.campaignId
          )
          .get();

      const batch =
        adminDb.batch();

      let retried = 0;

      snapshot.docs.forEach(
        (doc) => {
          if (
            doc.data()
              ?.status ===
            'failed'
          ) {
            retried += 1;

            batch.set(
              doc.ref,
              {
                status:
                  'queued',
                last_error:
                  null,
                updated_at:
                  new Date()
                    .toISOString(),
              },
              {
                merge: true,
              }
            );
          }
        }
      );

      if (retried > 0) {
        batch.set(
          adminDb
            .collection(
              'email_campaigns'
            )
            .doc(
              req.params.campaignId
            ),
          {
            status:
              'sending',
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            merge: true,
          }
        );

        await batch.commit();
      }

      return res.json({
        success: true,
        retried,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to retry failed recipients.',
        });
    }
  }
);

router.post(
  '/:campaignId/process',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const campaignRef =
        adminDb
          .collection(
            'email_campaigns'
          )
          .doc(
            req.params.campaignId
          );

      const campaignSnapshot =
        await campaignRef.get();

      if (!campaignSnapshot.exists) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Campaign not found.',
          });
      }

      const campaign =
        campaignSnapshot.data()!;

      if (
        campaign.status !==
        'sending'
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Campaign is not currently sending.',
          });
      }

      const requestedBatch =
        Number(
          req.body?.batchSize ||
          5
        );

      const batchSize =
        Math.max(
          1,
          Math.min(
            20,
            Number.isFinite(
              requestedBatch
            )
              ? Math.floor(
                  requestedBatch
                )
              : 5
          )
        );

      const recipientsSnapshot =
        await adminDb
          .collection(
            'email_campaign_recipients'
          )
          .where(
            'campaign_id',
            '==',
            req.params.campaignId
          )
          .get();

      const queued =
        recipientsSnapshot.docs
          .filter(
            (doc) =>
              doc.data()
                ?.status ===
              'queued'
          )
          .slice(
            0,
            batchSize
          );

      let sent = 0;
      let failed = 0;

      for (
        const recipientDoc
        of queued
      ) {
        const recipient =
          recipientDoc.data();

        const attempts =
          Number(
            recipient.attempts ||
            0
          ) + 1;

        try {
          await sendMail({
            to:
              String(
                recipient.email
              ),
            subject:
              String(
                campaign.subject
              ),
            html:
              buildCampaignHtml({
                name:
                  String(
                    recipient.name ||
                    ''
                  ),
                title:
                  String(
                    campaign.title
                  ),
                message:
                  String(
                    campaign.message
                  ),
                ctaLabel:
                  campaign.cta_label
                    ? String(
                        campaign.cta_label
                      )
                    : undefined,
                ctaUrl:
                  campaign.cta_url
                    ? String(
                        campaign.cta_url
                      )
                    : undefined,
              }),
            replyTo:
              process.env
                .SUPPORT_EMAIL ||
              'support@runtime.co.zw',
          });

          sent += 1;

          await recipientDoc.ref.set(
            {
              status:
                'sent',
              attempts,
              sent_at:
                new Date()
                  .toISOString(),
              last_error:
                null,
              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              merge: true,
            }
          );
        } catch (error) {
          failed += 1;

          await recipientDoc.ref.set(
            {
              status:
                'failed',
              attempts,
              last_error:
                error instanceof Error
                  ? error.message
                  : 'Unable to send email.',
              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              merge: true,
            }
          );
        }
      }

      const counts =
        await campaignCounts(
          req.params.campaignId
        );

      const completed =
        counts.queued === 0;

      await campaignRef.set(
        {
          status:
            completed
              ? 'completed'
              : 'sending',
          completed_at:
            completed
              ? new Date()
                  .toISOString()
              : null,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          merge: true,
        }
      );

      return res.json({
        success: true,
        processed:
          queued.length,
        sent,
        failed,
        completed,
        counts,
      });
    } catch (error) {
      console.error(
        'Process campaign failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to process campaign.',
        });
    }
  }
);

export default router;
