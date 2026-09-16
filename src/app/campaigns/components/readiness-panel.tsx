'use client';

import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { blockingReasons, isReady, type ReadinessItem } from '@/domain/ai-config';

/**
 * Whether this campaign is configured enough to call anyone.
 *
 * The wording matters: nothing has been trained. What is ready is the
 * configuration a calling agent will be given, and the panel says exactly
 * that. Optional items are listed as suggestions rather than failures, so a
 * campaign with the essentials is not held up by a blank knowledge box.
 */
export function ReadinessPanel({
  items,
  onTestCall,
  onStart,
  starting,
  running,
}: {
  items: ReadinessItem[];
  onTestCall: () => void;
  onStart: () => void;
  starting: boolean;
  running: boolean;
}) {
  const ready = isReady(items);
  const blockers = blockingReasons(items);
  const suggestions = items.filter((item) => !item.required && !item.done);

  return (
    <Card className={`readiness${ready ? ' is-ready' : ''}`}>
      <CardHeader
        title="AI call configuration"
        subtitle="What this campaign will give the agent on every call"
        action={
          <span className={`badge ${ready ? 'green' : 'amber'}`}>
            {ready ? 'Ready' : 'Not ready'}
          </span>
        }
      />

      <ul className="readiness-list">
        {items.map((item) => (
          <li key={item.id} className={item.done ? 'done' : item.required ? 'blocked' : 'optional'}>
            <span className="readiness-mark" aria-hidden="true">
              <Icon name={item.done ? 'check' : item.required ? 'alert' : 'plus'} size={13} />
            </span>
            <span className="readiness-copy">
              <strong>{item.label}</strong>
              {!item.done ? <span>{item.hint}</span> : null}
            </span>
            {!item.done && !item.required ? <span className="badge gray">Optional</span> : null}
          </li>
        ))}
      </ul>

      <div className="readiness-foot">
        <div className="readiness-status">
          {ready ? (
            <>
              <strong>AI call configuration ready</strong>
              <span>
                {suggestions.length > 0
                  ? `You can start calling. Adding ${suggestions.length === 1 ? 'the remaining optional item' : `the ${suggestions.length} optional items`} will make the calls more specific.`
                  : 'Everything is configured. Test it, then start the campaign.'}
              </span>
            </>
          ) : (
            <>
              <strong>Not ready yet</strong>
              <span>{blockers[0]}</span>
            </>
          )}
        </div>

        <div className="readiness-actions">
          <button type="button" className="secondary-button" onClick={onTestCall}>
            <Icon name="phone" size={15} /> Test call
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onStart}
            disabled={starting || (!ready && !running)}
          >
            <Icon name={running ? 'clock' : 'play'} size={15} />
            {starting ? 'Working…' : running ? 'Pause campaign' : 'Start campaign'}
          </button>
        </div>
      </div>
    </Card>
  );
}
