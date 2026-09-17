import { ApiError, request } from '@/lib/api/client'

/**
 * The things Zemo can actually do, as opposed to talk about.
 *
 * There are exactly two, and both are deliberate:
 *   - navigate, which is a link the user presses, never something Zemo does
 *     to the page while they are reading it;
 *   - submit a demo request, which writes one row through the public endpoint.
 *
 * Nothing here reads workspace data. Zemo describes pages, not their contents,
 * so there is no path by which it could show one workspace's rows to another.
 */

export interface DemoRequest {
  name: string
  email: string
  company?: string
  phone?: string
  note?: string
  sourceRoute?: string
}

/**
 * Records a demo request. Resolves only when the server confirms the write —
 * Zemo must never say "done" for something that failed on the way out.
 */
export async function submitDemoRequest(input: DemoRequest): Promise<void> {
  const data = await request('/api/demo-requests', {
    method: 'POST',
    body: JSON.stringify(input),
    fallback: 'I could not get that through. Try once more in a moment.',
  })

  if (!data || typeof data !== 'object' || (data as { received?: boolean }).received !== true) {
    throw new ApiError('I could not confirm that went through.', { status: 200 })
  }
}
