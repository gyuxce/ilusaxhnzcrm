export type PaymentChannel = 'web' | 'danacita' | 'manual'

export const PAYMENT_CHANNEL_OPTIONS: { value: PaymentChannel; label: string }[] = [
  { value: 'web', label: 'Via Web' },
  { value: 'danacita', label: 'Danacita' },
  { value: 'manual', label: 'Manual (Transfer)' },
]

export function paymentChannelLabel(value: string): string {
  return PAYMENT_CHANNEL_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function isPaymentChannel(value: string): value is PaymentChannel {
  return PAYMENT_CHANNEL_OPTIONS.some((o) => o.value === value)
}
