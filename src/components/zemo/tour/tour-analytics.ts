/**
 * Product-tour events.
 *
 * There is no analytics backend in this build, and wiring one up uninvited
 * would be both scope creep and a privacy decision that is not mine to make.
 * So these go nowhere: each event is dispatched as a DOM `CustomEvent` on
 * `window` and kept in a session-only ring buffer. Nothing is sent anywhere,
 * nothing is persisted, and a real sink can be attached later by listening for
 * `aibot:tour` without touching any of the tour code.
 *
 * The payloads carry step ids and indexes. Deliberately never a lead name, a
 * phone number, a workspace name or an email — a tour event says which part of
 * the product someone looked at, and nothing about who they are or what is in
 * their workspace.
 */

export type TourEvent =
  | 'tour_started'
  | 'tour_skipped'
  | 'tour_completed'
  | 'tour_step_viewed'
  | 'tour_step_completed'
  | 'zemo_opened'
  | 'zemo_question_asked'
  | 'demo_requested';

export interface TourEventPayload {
  /** Step id from tour-steps — a fixed vocabulary, never user content. */
  step?: string;
  index?: number;
  surface?: 'public' | 'app';
}

const BUFFER_LIMIT = 50;
const buffer: { event: TourEvent; at: number; payload: TourEventPayload }[] = [];

export function trackTour(event: TourEvent, payload: TourEventPayload = {}) {
  if (typeof window === 'undefined') return;

  const entry = { event, at: Date.now(), payload };
  buffer.push(entry);
  if (buffer.length > BUFFER_LIMIT) buffer.shift();

  try {
    window.dispatchEvent(new CustomEvent('aibot:tour', { detail: entry }));
  } catch {
    // CustomEvent is universally available; this is belt and braces for very
    // old engines, and an analytics event is never worth an exception.
  }
}

/** The events seen this session, for debugging. Not persisted. */
export function tourEventLog(): readonly { event: TourEvent; at: number; payload: TourEventPayload }[] {
  return buffer;
}
