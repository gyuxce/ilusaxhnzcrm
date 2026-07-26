export const PRD_TRIAL_MODE_CHANGED = 'prd-trial-mode-changed'

/** `false` = production live — tidak filter lead & tidak tampil banner mode uji. */
export const PRD_TRIAL_MODE_ENABLED = false

export const PRD_TRIAL_MODE_COOKIE = 'prd_trial_mode'
export const PRD_TRIAL_SINCE_COOKIE = 'prd_trial_since'

export function readPrdTrialSinceClient(): string | null {
  if (!PRD_TRIAL_MODE_ENABLED) return null
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';').map((s) => s.trim())
  const mode = cookies.find((c) => c.startsWith(`${PRD_TRIAL_MODE_COOKIE}=`))
  if (!mode?.endsWith('=1')) return null
  const since = cookies.find((c) => c.startsWith(`${PRD_TRIAL_SINCE_COOKIE}=`))
  if (!since) return null
  const value = since.slice(PRD_TRIAL_SINCE_COOKIE.length + 1)
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function formatTrialSinceLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}
