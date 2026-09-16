'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { resendCode, verifyEmail } from './actions'

/** Seconds the UI waits before offering another code. */
const RESEND_COOLDOWN_SECONDS = 60

export function OtpForm({
  email,
  next,
  justSent,
}: {
  email: string
  next: string
  /** True right after a code was sent, so the cooldown starts on arrival. */
  justSent: boolean
}) {
  const [remaining, setRemaining] = useState(justSent ? RESEND_COOLDOWN_SECONDS : 0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  return (
    <>
      <form className="auth-form" action={verifyEmail}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <label>
          6-digit code
          <input
            className="auth-otp"
            name="token"
            type="text"
            inputMode="numeric"
            /* Lets phones offer the code straight from the email. */
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            autoFocus
            required
          />
        </label>
        <VerifyButton />
      </form>

      <form className="auth-resend" action={resendCode}>
        <input type="hidden" name="email" value={email} />
        <ResendButton remaining={remaining} />
      </form>
    </>
  )
}

function VerifyButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="auth-primary" disabled={pending}>
      {pending ? 'Verifying…' : 'Verify email'}
    </button>
  )
}

function ResendButton({ remaining }: { remaining: number }) {
  const { pending } = useFormStatus()
  const waiting = remaining > 0

  return (
    <button type="submit" className="auth-link-button" disabled={pending || waiting}>
      {pending ? 'Sending…' : waiting ? `Resend code in ${remaining}s` : 'Resend code'}
    </button>
  )
}
