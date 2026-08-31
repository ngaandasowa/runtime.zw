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

export interface AnalyticsEvent {
  eventName: string;
  eventData?: Record<string, any>;
  timestamp: number;
}

class AnalyticsService {
  /**
   * Initialize analytics for a user
   */
  setUser(user: User | null) {
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
    try {
      logEvent(analytics, 'user_sign_in', {
        method,
        email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track sign-in:',
        error
      );
    }
  }

  /**
   * Track user sign-up
   */
  trackSignUp(
    email: string,
    method: 'email' | 'google' = 'email'
  ) {
    try {
      logEvent(analytics, 'user_sign_up', {
        method,
        email,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track sign-up:',
        error
      );
    }
  }

  /**
   * Track user sign-out
   */
  trackSignOut() {
    try {
      logEvent(analytics, 'user_sign_out', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track sign-out:',
        error
      );
    }
  }

  /**
   * Track domain search
   */
  trackDomainSearch(
    domain: string,
    type: 'registration' | 'transfer' | 'whois'
  ) {
    try {
      logEvent(analytics, 'domain_search', {
        domain,
        type,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track domain search:',
        error
      );
    }
  }

  /**
   * Track domain availability check
   */
  trackDomainCheck(
    domain: string,
    isAvailable: boolean
  ) {
    try {
      logEvent(analytics, 'domain_check', {
        domain,
        isAvailable,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track domain check:',
        error
      );
    }
  }

  /**
   * Track domain registration initiation
   */
  trackDomainRegistration(
    domain: string,
    registrationPeriod?: number
  ) {
    try {
      logEvent(
        analytics,
        'domain_registration_initiated',
        {
          domain,
          registrationPeriod,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.warn(
        'Failed to track domain registration:',
        error
      );
    }
  }

  /**
   * Track domain transfer initiation
   */
  trackDomainTransfer(domain: string) {
    try {
      logEvent(
        analytics,
        'domain_transfer_initiated',
        {
          domain,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.warn(
        'Failed to track domain transfer:',
        error
      );
    }
  }

  /**
   * Track checkout initiation
   */
  trackCheckoutStart(
    cartValue: number,
    itemCount: number
  ) {
    try {
      logEvent(analytics, 'checkout_started', {
        cartValue,
        itemCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track checkout start:',
        error
      );
    }
  }

  /**
   * Track payment initiation
   */
  trackPaymentStart(
    amount: number,
    currency: string = 'USD'
  ) {
    try {
      logEvent(analytics, 'payment_started', {
        amount,
        currency,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track payment start:',
        error
      );
    }
  }

  /**
   * Track payment completion
   */
  trackPaymentComplete(
    amount: number,
    currency: string = 'USD',
    method: string = 'card'
  ) {
    try {
      logEvent(analytics, 'payment_completed', {
        amount,
        currency,
        method,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track payment completion:',
        error
      );
    }
  }

  /**
   * Track wallet top-up
   */
  trackWalletTopup(amount: number) {
    try {
      logEvent(analytics, 'wallet_topup', {
        amount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track wallet topup:',
        error
      );
    }
  }

  /**
   * Track page/view navigation
   */
  trackPageView(pageName: string) {
    try {
      logEvent(analytics, 'page_view', {
        page_name: pageName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track page view:',
        error
      );
    }
  }

  /**
   * Track nameserver update
   */
  trackNameserverUpdate(domain: string) {
    try {
      logEvent(analytics, 'nameserver_updated', {
        domain,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track nameserver update:',
        error
      );
    }
  }

  /**
   * Track custom event
   */
  trackCustomEvent(
    eventName: string,
    eventData?: Record<string, any>
  ) {
    try {
      logEvent(analytics, eventName, {
        ...eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        `Failed to track custom event ${eventName}:`,
        error
      );
    }
  }

  /**
   * Track error event
   */
  trackError(
    errorMessage: string,
    errorContext?: string
  ) {
    try {
      logEvent(analytics, 'error_occurred', {
        errorMessage,
        errorContext,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track error:',
        error
      );
    }
  }

  /**
   * Track session start (for non-authenticated users)
   */
  trackSessionStart() {
    try {
      logEvent(analytics, 'session_started', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track session start:',
        error
      );
    }
  }

  /**
   * Track session end (for non-authenticated users)
   */
  trackSessionEnd() {
    try {
      logEvent(analytics, 'session_ended', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(
        'Failed to track session end:',
        error
      );
    }
  }
}

export const analyticsService =
  new AnalyticsService();
