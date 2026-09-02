import {
  logEvent,
  setUserProperties,
} from 'firebase/analytics';

import {
  analytics,
} from '../firebase/firebase';

import {
  User,
} from '../types';

import {
  analyticsRepository,
} from './AnalyticsRepository';

export interface AnalyticsEvent {
  eventName: string;
  eventData?: Record<string, any>;
  timestamp: number;
}

class AnalyticsService {
  private currentUser: User | null = null;
  private pageTrackingStarted = false;
  private lastTrackedPage = '';

  startPageViewTracking() {
    if (
      typeof window === 'undefined' ||
      this.pageTrackingStarted
    ) {
      return;
    }

    this.pageTrackingStarted = true;

    const trackCurrentPage = () => {
      const page =
        `${window.location.pathname}${window.location.search}` || '/';

      if (page === this.lastTrackedPage) {
        return;
      }

      this.lastTrackedPage = page;
      this.trackPageView(page);
    };

    const originalPushState =
      window.history.pushState.bind(window.history);
    const originalReplaceState =
      window.history.replaceState.bind(window.history);

    window.history.pushState = ((...args: Parameters<History['pushState']>) => {
      originalPushState(...args);
      window.dispatchEvent(new Event('runtime:navigation'));
    }) as History['pushState'];

    window.history.replaceState = ((...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args);
      window.dispatchEvent(new Event('runtime:navigation'));
    }) as History['replaceState'];

    window.addEventListener('popstate', trackCurrentPage);
    window.addEventListener('runtime:navigation', trackCurrentPage);

    trackCurrentPage();
  }

  /**
   * Log event to both Firebase Analytics and backend Firestore
   */
  private async _logToBackend(
    eventName: string,
    eventData?: Record<string, any>
  ) {
    // Log to backend Firestore (non-blocking)
    if (
      typeof window !== 'undefined'
    ) {
      analyticsRepository
        .logEvent(
          eventName,
          this.currentUser?.id || null,
          eventData
        )
        .catch((error) => {
          console.warn(
            'Failed to log to backend:',
            error
          );
        });
    }
  }

  /**
   * Initialize analytics for a user
   */
  setUser(user: User | null) {
    this.currentUser = user;

    if (!user) {
      return;
    }

    try {
      setUserProperties(analytics, {
        user_id: user.id,
        user_role: user.role,
        user_email: user.email,
      });
    } catch (error) {
      console.warn(
        'Failed to set user properties:',
        error
      );
    }
  }

  /**
   * Track user sign-in
   */
  trackSignIn(
    email: string,
    method: 'email' | 'google' = 'email'
  ) {
    const eventData = {
      method,
      email,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'user_sign_in', eventData);
    } catch (error) {
      console.warn(
        'Failed to track sign-in:',
        error
      );
    }

    // Also log to backend
    this._logToBackend('user_sign_in', eventData);
  }

  /**
   * Track user sign-up
   */
  trackSignUp(
    email: string,
    method: 'email' | 'google' = 'email'
  ) {
    const eventData = {
      method,
      email,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'user_sign_up', eventData);
    } catch (error) {
      console.warn(
        'Failed to track sign-up:',
        error
      );
    }

    // Also log to backend
    this._logToBackend('user_sign_up', eventData);
  }

  /**
   * Track user sign-out
   */
  trackSignOut() {
    const eventData = {
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'user_sign_out', eventData);
    } catch (error) {
      console.warn(
        'Failed to track sign-out:',
        error
      );
    }

    // Also log to backend
    this._logToBackend('user_sign_out', eventData);
  }

  /**
   * Track domain search
   */
  trackDomainSearch(
    domain: string,
    type: 'registration' | 'transfer' | 'whois'
  ) {
    const eventData = {
      domain,
      type,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'domain_search', eventData);
    } catch (error) {
      console.warn(
        'Failed to track domain search:',
        error
      );
    }

    this._logToBackend('domain_search', eventData);
  }

  /**
   * Track domain availability check
   */
  trackDomainCheck(
    domain: string,
    isAvailable: boolean
  ) {
    const eventData = {
      domain,
      isAvailable,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'domain_check', eventData);
    } catch (error) {
      console.warn(
        'Failed to track domain check:',
        error
      );
    }

    this._logToBackend('domain_check', eventData);
  }

  /**
   * Track domain registration initiation
   */
  trackDomainRegistration(
    domain: string,
    registrationPeriod?: number
  ) {
    const eventData = {
      domain,
      registrationPeriod,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(
        analytics,
        'domain_registration_initiated',
        eventData
      );
    } catch (error) {
      console.warn(
        'Failed to track domain registration:',
        error
      );
    }

    this._logToBackend('domain_registration_initiated', eventData);
  }

  /**
   * Track domain transfer initiation
   */
  trackDomainTransfer(domain: string) {
    const eventData = {
      domain,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(
        analytics,
        'domain_transfer_initiated',
        eventData
      );
    } catch (error) {
      console.warn(
        'Failed to track domain transfer:',
        error
      );
    }

    this._logToBackend('domain_transfer_initiated', eventData);
  }

  /**
   * Track checkout initiation
   */
  trackCheckoutStart(
    cartValue: number,
    itemCount: number
  ) {
    const eventData = {
      cartValue,
      itemCount,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'checkout_started', eventData);
    } catch (error) {
      console.warn(
        'Failed to track checkout start:',
        error
      );
    }

    this._logToBackend('checkout_started', eventData);
  }

  /**
   * Track payment initiation
   */
  trackPaymentStart(
    amount: number,
    currency: string = 'USD'
  ) {
    const eventData = {
      amount,
      currency,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'payment_started', eventData);
    } catch (error) {
      console.warn(
        'Failed to track payment start:',
        error
      );
    }

    this._logToBackend('payment_started', eventData);
  }

  /**
   * Track payment completion
   */
  trackPaymentComplete(
    amount: number,
    currency: string = 'USD',
    method: string = 'card'
  ) {
    const eventData = {
      amount,
      currency,
      method,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'payment_completed', eventData);
    } catch (error) {
      console.warn(
        'Failed to track payment completion:',
        error
      );
    }

    this._logToBackend('payment_completed', eventData);
  }

  /**
   * Track wallet top-up
   */
  trackWalletTopup(amount: number) {
    const eventData = {
      amount,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'wallet_topup', eventData);
    } catch (error) {
      console.warn(
        'Failed to track wallet topup:',
        error
      );
    }

    this._logToBackend('wallet_topup', eventData);
  }

  /**
   * Track page/view navigation
   */
  trackPageView(pageName: string) {
    const eventData = {
      page_name: pageName,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'page_view', eventData);
    } catch (error) {
      console.warn(
        'Failed to track page view:',
        error
      );
    }

    this._logToBackend('page_view', eventData);
  }

  /**
   * Track nameserver update
   */
  trackNameserverUpdate(domain: string) {
    const eventData = {
      domain,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'nameserver_updated', eventData);
    } catch (error) {
      console.warn(
        'Failed to track nameserver update:',
        error
      );
    }

    this._logToBackend('nameserver_updated', eventData);
  }

  /**
   * Track custom event
   */
  trackCustomEvent(
    eventName: string,
    eventData?: Record<string, any>
  ) {
    const data = {
      ...eventData,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, eventName, data);
    } catch (error) {
      console.warn(
        `Failed to track custom event ${eventName}:`,
        error
      );
    }

    this._logToBackend(eventName, data);
  }

  /**
   * Track error event
   */
  trackError(
    errorMessage: string,
    errorContext?: string
  ) {
    const eventData = {
      errorMessage,
      errorContext,
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'error_occurred', eventData);
    } catch (error) {
      console.warn(
        'Failed to track error:',
        error
      );
    }

    this._logToBackend('error_occurred', eventData);
  }

  /**
   * Track session start (for non-authenticated users)
   */
  trackSessionStart() {
    const eventData = {
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'session_started', eventData);
    } catch (error) {
      console.warn(
        'Failed to track session start:',
        error
      );
    }

    this._logToBackend('session_started', eventData);
  }

  /**
   * Track session end (for non-authenticated users)
   */
  trackSessionEnd() {
    const eventData = {
      timestamp: new Date().toISOString(),
    };

    try {
      logEvent(analytics, 'session_ended', eventData);
    } catch (error) {
      console.warn(
        'Failed to track session end:',
        error
      );
    }

    this._logToBackend('session_ended', eventData);
  }
}

export const analyticsService =
  new AnalyticsService();
