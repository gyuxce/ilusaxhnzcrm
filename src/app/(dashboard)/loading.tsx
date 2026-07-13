function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-border bg-card ${className}`}>
      <div className="h-full w-full rounded-2xl bg-muted/40" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <>
      <div className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-56 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>

      <main className="w-full p-4 sm:p-6">
        <div className="mx-auto w-full max-w-[1600px] space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
          </div>

          <SkeletonBlock className="h-20" />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
            <SkeletonBlock className="h-[520px]" />
            <div className="space-y-4">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-[440px]" />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
