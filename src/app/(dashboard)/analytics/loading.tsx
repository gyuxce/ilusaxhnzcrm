import { Header } from '@/components/layout/header'
import { LaporanLoadingShell } from '@/components/layout/laporan-loading-shell'

export default function AnalyticsLoading() {
  return (
    <>
      <Header title="Performa" subtitle="Memuat ringkasan performa…" />
      <LaporanLoadingShell label="Memuat Analytics…" />
    </>
  )
}
