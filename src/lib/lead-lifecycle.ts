import { LOST_STATUSES } from './lost-reasons'

export const TERMINAL_STATUSES = [
  ...LOST_STATUSES,
  'Seat Lock Paid',
  'Onboarding',
  'Class Started',
] as const

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]
export type LostStatus = (typeof LOST_STATUSES)[number]

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status)
}

export function isLostStatus(status: string): boolean {
  return (LOST_STATUSES as readonly string[]).includes(status)
}
