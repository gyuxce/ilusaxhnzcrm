import { Header } from '@/components/layout/header'
import { LaporanLoadingShell } from '@/components/layout/laporan-loading-shell'

export default function ReportsLoading() {
  return (
    <>
      <Header title="Report Harian" subtitle="Memuat ringkasan kerja tim…" />
      <LaporanLoadingShell label="Memuat Team Report…" />
    </>
  )
}
