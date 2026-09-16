'use client';

import { useCallback, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import {
  CALL_OBJECTIVES,
  CALL_OBJECTIVE_HINT,
  CALL_OBJECTIVE_LABEL,
  LIMITS,
  type AiCallConfig,
  type CallObjective,
} from '@/domain/ai-config';
import { ApiError } from '@/lib/api/client';
import { uploadScript } from '@/lib/campaigns';

/**
 * The campaign's AI call configuration.
 *
 * Sections follow the order a business owner thinks in: what you sell, what the
 * call is for, what to say, what to find out, and finally the constraints.
 * Nothing here trains a model — it is the context a calling agent is given, and
 * the copy says so rather than implying the product has learned anything.
 */

const ACCEPT = '.txt,.md,.markdown,text/plain,text/markdown';

export function AiConfigForm({
  value,
  campaignId,
  saving,
  onChange,
  onSave,
}: {
  value: AiCallConfig;
  campaignId: string;
  saving: boolean;
  onChange: (next: AiCallConfig) => void;
  onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof AiCallConfig>(key: K, next: AiCallConfig[K]) => {
      onChange({ ...value, [key]: next });
    },
    [onChange, value]
  );

  const chooseFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadNote(null);
    try {
      const result = await uploadScript(campaignId, file);
      // The extracted text lands in the editor rather than being saved
      // straight away, so the user sees what came out of the file first.
      onChange({ ...value, callScript: result.script });
      setUploadNote(
        `Loaded ${result.fileName} — ${result.characters.toLocaleString()} characters. Review it, then save.`
      );
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setUploadError(apiError?.message ?? 'That file could not be read.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [campaignId, onChange, value]);

  return (
    <>
      <Card>
        <CardHeader
          title="Product"
          subtitle="What this campaign is selling, in the words the agent should use"
        />
        <div className="card-body form-grid">
          <label className="field">
            <span className="field-label">Product or service name</span>
            <input
              className="field-input"
              maxLength={LIMITS.productName}
              value={value.productName ?? ''}
              placeholder="2BHK apartments"
              onChange={(event) => set('productName', event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="field-textarea"
              rows={3}
              maxLength={LIMITS.productDescription}
              value={value.productDescription ?? ''}
              placeholder="We sell ready-to-move 2BHK and 3BHK apartments in Gachibowli, priced 65L to 1.2Cr."
              onChange={(event) => set('productDescription', event.target.value)}
            />
            <span className="field-hint">
              The agent says the first sentence of this out loud, so write it the way you would say
              it on a call.
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Call objective"
          subtitle="What a good call ends with — this decides how the agent closes"
        />
        <div className="card-body">
          <div className="objective-grid">
            {CALL_OBJECTIVES.map((objective) => (
              <label
                key={objective}
                className={`objective-option${value.callObjective === objective ? ' selected' : ''}`}
              >
                <input
                  type="radio"
                  name="call-objective"
                  className="visually-hidden"
                  checked={value.callObjective === objective}
                  onChange={() => set('callObjective', objective as CallObjective)}
                />
                <strong>{CALL_OBJECTIVE_LABEL[objective]}</strong>
                <span>{CALL_OBJECTIVE_HINT[objective]}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Call script"
          subtitle="Paste the script your team already uses, or upload it"
          action={
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="visually-hidden"
                onChange={(event) => void chooseFile(event.target.files?.[0])}
              />
              <button
                type="button"
                className="secondary-button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="upload" size={15} />
                {uploading ? 'Reading…' : 'Upload script'}
              </button>
            </>
          }
        />
        <div className="card-body">
          {uploadError ? (
            <p className="form-alert" role="alert">
              {uploadError}
            </p>
          ) : null}
          {uploadNote ? <p className="form-notice">{uploadNote}</p> : null}

          <label className="field">
            <span className="visually-hidden">Call script</span>
            <textarea
              className="field-textarea script-editor"
              rows={12}
              maxLength={LIMITS.callScript}
              value={value.callScript ?? ''}
              placeholder={
                'Hi, this is Aarav calling from Skyline Homes about your enquiry.\n\nCan I ask you a few quick questions?\n…'
              }
              onChange={(event) => set('callScript', event.target.value)}
            />
            <span className="field-hint">
              The agent opens with your first line. Accepts .txt and .md files — for a PDF or Word
              document, copy the text and paste it here.
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Qualification"
          subtitle="What the agent should find out — one per line"
        />
        <div className="card-body">
          <label className="field">
            <span className="visually-hidden">Qualification questions</span>
            <textarea
              className="field-textarea"
              rows={5}
              maxLength={LIMITS.qualificationQuestions}
              value={value.qualificationQuestions ?? ''}
              placeholder={'Budget range\nPreferred location\nPossession timeline'}
              onChange={(event) => set('qualificationQuestions', event.target.value)}
            />
            <span className="field-hint">
              The agent works through the first three on the call. These take priority over the
              agent&rsquo;s own instructions.
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Campaign knowledge"
          subtitle="Facts the agent may rely on — it will not invent anything beyond these"
        />
        <div className="card-body">
          <label className="field">
            <span className="visually-hidden">Campaign knowledge</span>
            <textarea
              className="field-textarea"
              rows={5}
              maxLength={LIMITS.knowledge}
              value={value.knowledge ?? ''}
              placeholder={'Possession from March.\nBank approvals in place with HDFC and SBI.\nCovered parking included.'}
              onChange={(event) => set('knowledge', event.target.value)}
            />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="AI instructions"
          subtitle="Anything the agent must always say, and anything it must never say"
        />
        <div className="card-body form-grid">
          <label className="field">
            <span className="field-label">Must say</span>
            <textarea
              className="field-textarea"
              rows={3}
              maxLength={LIMITS.mustSay}
              value={value.mustSay ?? ''}
              placeholder="This call may be recorded for quality."
              onChange={(event) => set('mustSay', event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Must not say</span>
            <textarea
              className="field-textarea"
              rows={3}
              maxLength={LIMITS.mustNotSay}
              value={value.mustNotSay ?? ''}
              placeholder={'guaranteed returns\ncheapest in the market'}
              onChange={(event) => set('mustNotSay', event.target.value)}
            />
            <span className="field-hint">
              One phrase per line. The agent avoids any wording containing them.
            </span>
          </label>

          <div className="form-actions">
            <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save configuration'}
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
