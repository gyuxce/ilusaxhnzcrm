import { redirect } from 'next/navigation'

/** Legacy FU Hari Ini / Work Queue — diganti alur PRD V3 (Leads → Stage 1). */
export default function WorkQueuePage() {
  redirect('/leads')
}
