import { redirect } from 'next/navigation'

/** Legacy Follow-Ups / FU Hari Ini — diganti alur PRD V3. */
export default function FollowUpsPage() {
  redirect('/leads')
}
