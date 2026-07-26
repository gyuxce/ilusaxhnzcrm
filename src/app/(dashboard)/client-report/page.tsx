import { redirect } from 'next/navigation'

/** Legacy laporan tabs — diganti Dashboard PRD V3 saja. */
export default function ClientReportPage() {
  redirect('/dashboard')
}
