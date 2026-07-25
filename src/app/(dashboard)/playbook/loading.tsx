import { Header } from '@/components/layout/header'
import { LaporanLoadingShell } from '@/components/layout/laporan-loading-shell'

export default function PlaybookLoading() {
  return (
    <>
      <Header title="Playbook" subtitle="Memuat playbook…" />
      <LaporanLoadingShell label="Memuat Playbook…" />
    </>
  )
}