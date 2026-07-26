import { Header } from '@/components/layout/header'
import { ConversionDetailClient, type PaymentWithLead } from '@/components/conversions/conversion-detail-client'
import { createClient } from '@/lib/supabase/server'
import { getPrdTrialSince } from '@/app/actions/prd-trial-mode'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<{ type?: string }>
}

const PAYMENT_SELECT = `
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
    `

export default async function ConversionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const trialSince = await getPrdTrialSince()

  let data: PaymentWithLead[] | null = []

  if (trialSince) {
    const { data: trialLeads } = await supabase
      .from('leads')
      .select('id')
      .gte('created_at', trialSince)
      .limit(10000)

    const leadIds = (trialLeads || []).map((row: { id: string }) => row.id)
    if (leadIds.length > 0) {
      const res = (await supabase
        .from('payments')
        .select(PAYMENT_SELECT)
        .eq('verification_status', 'verified')
        .in('lead_id', leadIds)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5000)) as { data: PaymentWithLead[] | null }
      data = res.data
    }
  } else {
    const res = (await supabase
      .from('payments')
      .select(PAYMENT_SELECT)
      .eq('verification_status', 'verified')
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5000)) as { data: PaymentWithLead[] | null }
    data = res.data
  }

  return (
    <>
      <Header
        title="Pembayaran"
        subtitle={
          trialSince
            ? 'Mode uji: hanya pembayaran verified untuk lead baru (setelah mode uji aktif).'
            : 'Daftar pembayaran verified. Angka revenue di Laporan diambil dari sini.'
        }
      />
      <ConversionDetailClient payments={data || []} initialType={params?.type || 'all'} />
    </>
  )
}
