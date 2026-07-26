'use server'

import { revalidatePath } from 'next/cache'

/** Pastikan daftar Leads server-render ulang setelah tambah/import lead. */
export async function revalidateLeadsListing() {
  revalidatePath('/leads', 'layout')
  revalidatePath('/leads')
  revalidatePath('/leads/new')
  revalidatePath('/stage-1', 'layout')
  revalidatePath('/stage-1')
  revalidatePath('/stage-2', 'layout')
  revalidatePath('/stage-2')
  revalidatePath('/stage-3', 'layout')
  revalidatePath('/stage-3')
}
