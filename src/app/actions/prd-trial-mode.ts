'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  PRD_TRIAL_MODE_COOKIE,
  PRD_TRIAL_MODE_ENABLED,
  PRD_TRIAL_SINCE_COOKIE,
} from '@/lib/prd-trial-mode'

const COOKIE_OPTS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax' as const,
  /** Client (Stage 1/2, dashboard) perlu baca cookie yang sama dengan server. */
  httpOnly: false,
}

function clearTrialCookies(store: Awaited<ReturnType<typeof cookies>>) {
  store.delete(PRD_TRIAL_MODE_COOKIE)
  store.delete(PRD_TRIAL_SINCE_COOKIE)
}

/** Hapus cookie mode uji saat live — dipanggil dari dashboard layout. */
export async function ensurePrdLiveMode() {
  if (PRD_TRIAL_MODE_ENABLED) return
  clearTrialCookies(await cookies())
}

export async function setPrdTrialMode(enabled: boolean): Promise<{ ok: true; since: string | null }> {
  const store = await cookies()
  if (!PRD_TRIAL_MODE_ENABLED) {
    clearTrialCookies(store)
    return { ok: true, since: null }
  }
  if (enabled) {
    const since = new Date().toISOString()
    store.set(PRD_TRIAL_MODE_COOKIE, '1', COOKIE_OPTS)
    store.set(PRD_TRIAL_SINCE_COOKIE, since, COOKIE_OPTS)
    revalidatePath('/leads')
    revalidatePath('/stage-1')
    revalidatePath('/stage-2')
    revalidatePath('/stage-3')
    revalidatePath('/dashboard')
    revalidatePath('/conversions')
    return { ok: true, since }
  }
  clearTrialCookies(store)
  revalidatePath('/leads')
  revalidatePath('/stage-1')
  revalidatePath('/stage-2')
  revalidatePath('/stage-3')
  revalidatePath('/dashboard')
  revalidatePath('/conversions')
  return { ok: true, since: null }
}

export async function getPrdTrialSince(): Promise<string | null> {
  if (!PRD_TRIAL_MODE_ENABLED) return null
  const store = await cookies()
  if (store.get(PRD_TRIAL_MODE_COOKIE)?.value !== '1') return null
  return store.get(PRD_TRIAL_SINCE_COOKIE)?.value ?? null
}
