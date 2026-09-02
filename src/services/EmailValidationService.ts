const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://api.runtime.co.zw');

export type EmailValidationResult = {
  valid: boolean;
  normalizedEmail?: string;
  domain?: string;
  mailServers?: string[];
  reason?: string;
  message?: string;
};

class EmailValidationService {
  async validateForRegistration(
    email: string
  ): Promise<
    EmailValidationResult
  > {
    let response:
      Response;

    try {
      response =
        await fetch(
          `${API_BASE_URL}/api/auth/email-check`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                email,
              }),
          }
        );
    } catch {
      throw new Error(
        'We could not validate this email right now. Check your connection and try again.'
      );
    }

    let result:
      EmailValidationResult;

    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        'We could not validate this email right now. Please try again.'
      );
    }

    if (
      !response.ok ||
      !result.valid
    ) {
      throw new Error(
        result.message ||
        'Enter a valid email address.'
      );
    }

    return result;
  }
}

export const emailValidationService =
  new EmailValidationService();
