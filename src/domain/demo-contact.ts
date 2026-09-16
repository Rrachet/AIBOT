/**
 * The stand-in used for an agent demo call when a workspace has no leads yet.
 *
 * Shared because both the server that creates it and the dialog that promises
 * it must name the same person: if these drift, the screen tells the user the
 * call is to someone other than the contact actually created.
 *
 * Deliberately not a real number. It is a reserved-looking Indian mobile that
 * no live call path can reach — and nothing in AIBOT dials anything anyway.
 */
export const DEMO_CONTACT = {
  name: 'Rajesh Kumar',
  phone: '+91 90000 00000',
  company: 'Demo contact',
} as const;
