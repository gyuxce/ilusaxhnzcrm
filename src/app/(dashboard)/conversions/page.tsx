import { Header } from '@/components/layout/header'
import { ConversionDetailClient, type PaymentWithLead } from '@/components/conversions/conversion-detail-client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<{ type?: string }>
}

export default async function ConversionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data } = (await supabase
    .from('payments')
    .select(`
      id,
      lead_id,
      payment_type,
      amount,
      payment_method,
      payment_date,
      verification_status,
      notes,
      created_at,
      leads(id, full_name, whatsapp_number, source_campaign)
    `)
    .eq('verification_status', 'verified')
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000)) as { data: PaymentWithLead[] | null }

  return (
    <>
      <Header title="Detail Pembayaran" subtitle="Daftar pembayaran verified dari sumber angka revenue dashboard." />
      <ConversionDetailClient payments={data || []} initialType={params?.type || 'all'} />
    </>
  )
}
