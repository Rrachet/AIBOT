import type { ZemoContext } from './zemo-context';

/**
 * How a question becomes something Zemo does.
 *
 * Three named stages, in one direction:
 *
 *   ZemoInput  — something a person did: typed a line, pressed a chip, or
 *                (later) said a sentence out loud.
 *   ZemoIntent — what that meant, as one of a closed set of kinds.
 *   ZemoAction — what Zemo may offer to do about it, as one of a closed set
 *                of safe operations.
 *
 * The point of writing it down as three types rather than one function is the
 * seam in the middle. Today intent is recognised by matching words, because
 * this build pays for no AI provider. Tomorrow it could be a model. Either way
 * it produces a `ZemoIntent`, and everything downstream — the answers, the
 * actions, the widget that performs them — is unchanged.
 *
 * The seam at the front does the same job for input. `source` is carried
 * through rather than assumed, so a microphone is a third value in one union
 * and nothing else moves. Speech is deliberately not wired up here: the type
 * exists so that adding it is a change in one place instead of everywhere.
 *
 * ## What an action may be
 *
 * Every action in the union below is reversible and harmless: go to a page,
 * take the tour, ask Zemo something else. There is deliberately no action for
 * creating, editing, sending, deleting or running anything. An assistant that
 * can press the buttons is an assistant that can press the wrong one, and the
 * blast radius of "Zemo misheard you" has to stay at "Zemo opened the wrong
 * page".
 *
 * That is a rule about the model, not about the current implementation: there
 * is no privileged path here to widen later. Actions carry no workspace id, no
 * credentials and no request body, and `allowedAction()` rejects anything
 * pointing outside the routes the application already navigates to.
 */

/**
 * Where an input came from.
 *
 * `system` covers the things Zemo says on its own — a greeting, a line about
 * the voice preview — which travel the same pipeline so they cannot drift into
 * a separate set of rules.
 */
export type ZemoInputSource = 'keyboard' | 'suggestion' | 'voice' | 'system';

export interface ZemoInput {
  text: string;
  source: ZemoInputSource;
  context: ZemoContext;
}

export type ZemoIntentKind =
  | 'run-tour'
  | 'navigate'
  | 'request-demo'
  | 'pricing'
  | 'simulation-honesty'
  | 'define-term'
  | 'explain-page'
  | 'next-step'
  | 'voice-preview'
  | 'how-to'
  | 'about-zemo'
  | 'courtesy'
  | 'unknown';

export interface ZemoIntent {
  kind: ZemoIntentKind;
  source: ZemoInputSource;
  /** What the intent is about: a route, a glossary term, a plan id. */
  subject?: string;
  /**
   * `low` when the kind was reached by a loose match and the answer should
   * admit it. `unknown` is always low.
   */
  confidence: 'high' | 'low';
}

/**
 * The complete set of things Zemo may offer to do.
 *
 * Each one is a button the person presses. Zemo never performs an action
 * because it decided to — the one exception is the tour, which runs after the
 * person asked for it in words, and which they can leave at any step.
 */
export type ZemoAction =
  | { kind: 'navigate'; label: string; href: string }
  | { kind: 'start-tour'; label: string }
  | { kind: 'ask'; label: string; question: string };

/**
 * Routes Zemo may send someone to.
 *
 * An allow-list rather than a shape check, because "starts with a slash" also
 * matches `/api/...` and a path with a query string on the end. Navigation is
 * the only action that names a destination, and this is the whole of it.
 *
 * Being on this list is not permission to see the page. Every one of these
 * routes is guarded on the server by `requireUser()`, and an anonymous
 * visitor who follows a link to `/leads` is sent to sign in exactly as they
 * would be by typing it into the address bar. Zemo offering a link has never
 * been, and must never become, evidence that the person may open it.
 */
export const ZEMO_ROUTES: readonly string[] = [
  '/',
  '/pricing',
  '/login',
  '/signup',
  '/dashboard',
  '/leads',
  '/agents',
  '/campaigns',
  '/calls',
  '/follow-ups',
  '/whatsapp',
  '/analytics',
  '/settings',
];

/**
 * Whether an action is one Zemo is allowed to put on screen.
 *
 * Called before rendering rather than only at construction, so a malformed or
 * unexpected action is dropped at the last possible moment instead of being
 * trusted because of where it came from.
 */
export function allowedAction(action: ZemoAction | undefined): action is ZemoAction {
  if (!action) return false;
  switch (action.kind) {
    case 'navigate':
      return ZEMO_ROUTES.includes(action.href);
    case 'start-tour':
      return true;
    case 'ask':
      return action.question.trim().length > 0;
    default:
      return false;
  }
}

/** Convenience constructors, so a typo in a kind is a compile error. */
export function goTo(label: string, href: string): ZemoAction {
  return { kind: 'navigate', label, href };
}

export function takeTour(label = 'Show me around'): ZemoAction {
  return { kind: 'start-tour', label };
}

export function askAbout(label: string, question = label): ZemoAction {
  return { kind: 'ask', label, question };
}
