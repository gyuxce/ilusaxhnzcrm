import { redirect } from 'next/navigation'

/**
 * Legacy campaigns module queried a dropped `campaigns` table.
 * Keep the route so old bookmarks don't 404 — send users to Leads.
 * No data is deleted.
 */
export default function CampaignsPage() {
  redirect('/leads')
}
