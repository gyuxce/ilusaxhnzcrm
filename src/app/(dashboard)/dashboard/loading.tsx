import { Header } from '@/components/layout/header'
import { LaporanLoadingShell } from '@/components/layout/laporan-loading-shell'

export default function DashboardLoading() {
  return (
    <>
      <Header title="Laporan" subtitle="Memuat ringkasan…" />
      <LaporanLoadingShell label="Memuat Overview…" />
    </>
  )
}
