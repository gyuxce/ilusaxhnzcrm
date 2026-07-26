import { redirect } from 'next/navigation'

/** Legacy playbook / alasan gagal — diganti alur Stage 1 (hasil follow-up). */
export default function PlaybookPage() {
  redirect('/dashboard')
}
