/**
 * Every outcome the auth flow can redirect back with.
 *
 * Shared by the sign-in and sign-up screens so a message can never say one
 * thing on one page and something else on the other.
 */
export const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'The email or password is incorrect.',
  invalid_email: 'Enter a valid email address.',
  invalid_signup: 'Fill in every field to create your workspace.',
  password_too_short: 'Use a password of at least 8 characters (72 maximum).',
  password_mismatch: 'Those passwords do not match.',
  email_taken: 'That email is already registered. Sign in instead, or use another address.',
  signup_failed: 'We could not create your workspace. Try again in a moment.',
  signup_email_failed:
    'Your workspace could not be created because the confirmation email could not be sent. Check the email provider settings for this project.',
  signup_rate_limited:
    'Too many signup emails have been sent recently. Wait a few minutes and try again.',
  signup_disabled: 'New signups are turned off for this project.',
  password_rejected: 'That password was refused. Choose a longer or less common one.',
  email_not_confirmed:
    'Confirm your email first. Click the link in the message we sent you, then sign in.',
  check_email:
    'Workspace created. Check your email and click the confirmation link to activate it.',
  confirmation_failed:
    'That confirmation link is invalid or has expired. Sign up again to get a new one.',
  confirmation_exchange_failed:
    'That confirmation link could not be completed. Open it in the browser you signed up in, or sign up again to get a new link.',
  configuration_error:
    'This AIBOT server is not configured to sign you in yet. Set the Supabase environment variables and restart it.',
  session_not_established:
    'Your credentials were accepted but the session could not be stored. Check that cookies are enabled and try again.',
};
