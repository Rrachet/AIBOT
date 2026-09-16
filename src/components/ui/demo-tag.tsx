/**
 * Marks something AIBOT simulated rather than actually did.
 *
 * Wherever a simulated record is shown next to what a real one would look
 * like, this has to be visible without hovering, expanding or reading a
 * tooltip — a demo call must never be mistakable for a call that reached a
 * phone. The wording says what did not happen, not merely that this is a
 * sample.
 */
export function DemoCallTag() {
  return (
    <span className="demo-tag" title="Simulated by AIBOT — no phone number was dialled">
      Demo call
    </span>
  );
}

export function DemoMessageTag() {
  return (
    <span className="demo-tag" title="Simulated by AIBOT — no message was delivered">
      Demo / Simulated WhatsApp
    </span>
  );
}
