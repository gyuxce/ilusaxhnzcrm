export function LaporanLoadingShell({ label = 'Memuat laporan…' }: { label?: string }) {
  return (
    <div className="w-full p-6 animate-fade-in">
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  )
}
