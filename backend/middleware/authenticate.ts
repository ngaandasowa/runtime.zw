import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  adminAuth,
  adminDb,
} from '../firebaseAdmin.js';

export type RuntimeUser = {
  uid: string;
  email: string;
  name: string;
  role: string;
};

export type RuntimeAuthenticatedRequest =
  Request & {
    runtimeUser?: RuntimeUser;
  };

type CachedProfile = {
  expiresAt: number;
  name: string;
  role: string;
};

// A short cache prevents every protected API call from consuming an
// additional Firestore read just to rediscover the same user role/name.
// Keep this deliberately short so admin role/profile changes propagate
// quickly across a live Render instance.
const PROFILE_CACHE_TTL_MS = 60_000;
const profileCache = new Map<string, CachedProfile>();

const getCachedProfile = (uid: string) => {
  const cached = profileCache.get(uid);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    profileCache.delete(uid);
    return null;
  }

  return cached;
};

const loadProfile = async (
  uid: string,
  fallbackName: string
) => {
  const cached = getCachedProfile(uid);

  if (cached) {
    return cached;
  }

  const snapshot =
    await adminDb
      .collection('users')
      .doc(uid)
      .get();

  const data =
    snapshot.exists
      ? snapshot.data()
      : undefined;

  const profile: CachedProfile = {
    name: String(
      data?.name ||
        fallbackName ||
        'Runtime customer'
    ),
    role: String(
      data?.role ||
        'customer'
    ),
    expiresAt:
      Date.now() +
      PROFILE_CACHE_TTL_MS,
  };

  profileCache.set(uid, profile);
  return profile;
};

const verifyRequestToken = async (
  req: Request,
  res: Response
) => {
  const header =
    req.headers.authorization;

  if (
    !header?.startsWith(
      'Bearer '
    )
  ) {
    res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
    return null;
  }

  try {
    return await adminAuth
      .verifyIdToken(
        header.slice(7)
      );
  } catch (error) {
    console.error(
      'Firebase token verification failed:',
      error
    );

    res.status(401).json({
      success: false,
      message:
        'Your session is invalid or has expired. Sign in again.',
    });
    return null;
  }
};

/**
 * Identity-only authentication.
 *
 * Use this when a route only needs the authenticated uid/email. It does
 * not read Firestore, so it remains independent of Firestore read quota.
 */
export const authenticateIdentity =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const runtimeReq =
      req as RuntimeAuthenticatedRequest;

    const decoded =
      await verifyRequestToken(
        req,
        res
      );

    if (!decoded) {
      return;
    }

    runtimeReq.runtimeUser = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: String(
        decoded.name ||
          decoded.email ||
          'Runtime customer'
      ),
      role: 'customer',
    };

    return next();
  };

/**
 * Authentication with Runtime profile/role.
 *
 * Firebase token failures are 401s. Firestore/profile failures are 503s,
 * so quota exhaustion or a database outage is never misreported as an
 * invalid login. Profile reads are cached briefly to reduce read usage.
 */
export const authenticateWithProfile =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const runtimeReq =
      req as RuntimeAuthenticatedRequest;

    const decoded =
      await verifyRequestToken(
        req,
        res
      );

    if (!decoded) {
      return;
    }

    const fallbackName = String(
      decoded.name ||
        decoded.email ||
        'Runtime customer'
    );

    try {
      const profile =
        await loadProfile(
          decoded.uid,
          fallbackName
        );

      runtimeReq.runtimeUser = {
        uid: decoded.uid,
        email: decoded.email || '',
        name: profile.name,
        role: profile.role,
      };

      return next();
    } catch (error) {
      console.error(
        'Runtime user profile load failed:',
        error
      );

      return res.status(503).json({
        success: false,
        message:
          'Runtime database is temporarily unavailable. Please try again shortly.',
      });
    }
  };

// Useful after an admin changes a user's role/profile in the same process.
export const clearRuntimeUserProfileCache =
  (uid?: string) => {
    if (uid) {
      profileCache.delete(uid);
      return;
    }

    profileCache.clear();
  };
