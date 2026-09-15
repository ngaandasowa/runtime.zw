import {
  renewalLifecycleService,
} from './RenewalLifecycleService.js';

let renewalTimer:
  ReturnType<typeof setInterval> | null =
    null;

let running = false;

const runSafely = async () => {
  if (running) {
    return;
  }

  running = true;

  try {
    const result =
      await renewalLifecycleService
        .runProduction();

    console.log(
      `[Renewals] production lifecycle: scanned=${result.scanned}, matched=${result.matched}, date=${result.simulatedDate}`
    );
  } catch (error) {
    console.error(
      '[Renewals] production lifecycle failed:',
      error
    );
  } finally {
    running = false;
  }
};

export const startRenewalLifecycleScheduler =
  () => {
    if (renewalTimer) {
      return;
    }

    const hours = Math.max(
      1,
      Number(
        process.env
          .RENEWAL_LIFECYCLE_INTERVAL_HOURS ||
          6
      ) || 6
    );

    /*
     * Run shortly after boot, then periodically.
     * Lifecycle events are idempotent in Firestore, so repeated checks
     * do not intentionally send the same milestone twice.
     */
    setTimeout(
      () => {
        void runSafely();
      },
      30_000
    );

    renewalTimer =
      setInterval(
        () => {
          void runSafely();
        },
        hours * 60 * 60 * 1000
      );

    renewalTimer.unref?.();

    console.log(
      `[Renewals] production scheduler started (${hours} hour interval).`
    );
  };
