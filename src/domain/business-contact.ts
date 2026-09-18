/**
 * The business behind the calls.
 *
 * Configuration, not credentials. These are the details a workspace would want
 * an outbound call or a WhatsApp message to carry — who is calling, from which
 * number, under which display name — recorded now so that connecting a
 * provider later is a matter of pointing it at settings that already exist.
 *
 * Nothing here dials, sends or verifies anything, and none of it is a secret:
 * a business phone number is printed on the business's own website. Provider
 * keys, when there are any, will not live here.
 *
 * Every field is optional. A workspace that has filled in none of them is the
 * normal state and must keep working exactly as it does today.
 */

export interface BusinessContact {
  /** The name the agent gives on a call. Often the workspace name, not always. */
  businessName: string | null;
  businessPhone: string | null;
  whatsappNumber: string | null;
  /** The name a WhatsApp recipient would see. */
  whatsappDisplayName: string | null;
  /** A dialling code, e.g. `+91`, used when a number is entered without one. */
  defaultCountryCode: string | null;
  businessEmail: string | null;
}

export const EMPTY_BUSINESS_CONTACT: BusinessContact = Object.freeze({
  businessName: null,
  businessPhone: null,
  whatsappNumber: null,
  whatsappDisplayName: null,
  defaultCountryCode: null,
  businessEmail: null,
});

/**
 * The dialling codes offered in the picker.
 *
 * A short list rather than every country on earth: this is a default for
 * numbers typed without a code, and a list of two hundred entries to scroll
 * through would be worse at that job than ten. India is first because it is
 * where AIBOT's customers are. Anything outside the list can still be typed
 * into the number itself in full.
 */
export const COUNTRY_CODES: readonly { code: string; label: string }[] = [
  { code: '+91', label: 'India (+91)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+1', label: 'United States / Canada (+1)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+49', label: 'Germany (+49)' },
];

/** A dialling code: a plus, then one to four digits. */
export const COUNTRY_CODE_PATTERN = /^\+[1-9][0-9]{0,3}$/;

/**
 * A phone number, loosely.
 *
 * Deliberately permissive about spacing, brackets and dashes, and strict only
 * about the count of digits: 7 is shorter than any dialable number and 15 is
 * the most E.164 allows. Anything tighter would reject numbers that are
 * perfectly valid somewhere, and this field is not what decides whether a call
 * connects — no provider is connected yet.
 */
export function phoneDigits(value: string): number {
  return (value.match(/[0-9]/g) ?? []).length;
}

export function looksLikePhone(value: string): boolean {
  if (!/^\+?[0-9][0-9\s()‐-―.-]*$/.test(value.trim())) return false;
  const digits = phoneDigits(value);
  return digits >= 7 && digits <= 15;
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Reads a contact out of an API response, missing fields included. */
export function readBusinessContact(value: unknown): BusinessContact {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_BUSINESS_CONTACT };
  const record = value as Record<string, unknown>;
  return {
    businessName: text(record.businessName),
    businessPhone: text(record.businessPhone),
    whatsappNumber: text(record.whatsappNumber),
    whatsappDisplayName: text(record.whatsappDisplayName),
    defaultCountryCode: text(record.defaultCountryCode),
    businessEmail: text(record.businessEmail),
  };
}
