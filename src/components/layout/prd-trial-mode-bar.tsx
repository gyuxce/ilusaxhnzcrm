'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { FlaskConical, Loader2, Eye, EyeOff } from 'lucide-react'
import { setPrdTrialMode } from '@/app/actions/prd-trial-mode'
import { formatTrialSinceLabel, readPrdTrialSinceClient, PRD_TRIAL_MODE_CHANGED } from '@/lib/prd-trial-mode'
import { cn } from '@/lib/utils'

export function PrdTrialModeBar() {
  const router = useRouter()
  const [since, setSince] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setSince(readPrdTrialSinceClient())
  }, [])

  const active = Boolean(since)

  function toggle(next: boolean) {
    startTransition(async () => {
      const res = await setPrdTrialMode(next)
      setSince(res.since)
      window.dispatchEvent(new Event(PRD_TRIAL_MODE_CHANGED))
      router.refresh()
    })
  }

  return (
    <div
      className={cn(
        'border-b px-4 py-2.5 text-xs sm:px-5',
        active
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <FlaskConical size={16} className="mt-0.5 shrink-0 opacity-80" />
          <div className="min-w-0">
            {active ? (
              <>
                <p className="font-semibold">Mode uji aktif — angka = data baru saja</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Lead dibuat setelah {formatTrialSinceLabel(since!)} (WIB). Data lama (~1000 import)
                  masih di database, hanya disembunyikan — tidak dihapus.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Mau coba dari nol tanpa hapus data lama?</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Aktifkan mode uji dulu, lalu import CSV / tambah lead manual. Tabel & pipeline hanya
                  menampilkan lead baru; nonaktifkan kapan saja untuk lihat semua data lagi.
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => toggle(!active)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-60',
            active
              ? 'bg-card text-foreground border border-border hover:bg-secondary'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          )}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : active ? (
            <Eye size={14} />
          ) : (
            <EyeOff size={14} />
          )}
          {active ? 'Tampilkan semua data' : 'Aktifkan mode uji'}
        </button>
      </div>
    </div>
  )
}
