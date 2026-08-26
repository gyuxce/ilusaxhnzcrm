'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User as AuthUser } from '@supabase/supabase-js'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { Loader2, User as UserIcon, Users, BookOpen, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ENTITIES, getEntityForCampaign, type Entity } from '@/lib/entity'

interface DBUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface CampaignRow {
  source_campaign: string
  leadCount: number
  entity: Entity
  isOverride: boolean
}

/**
 * Slim settings: profile for everyone + user roles for admin/owner.
 * Batch targets & kamus removed — kamus/flow lives in /guide.
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'campaigns'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState({
    name: '',
    role: '',
    email: '',
  })
  const [usersList, setUsersList] = useState<DBUser[]>([])
  const [campaignsList, setCampaignsList] = useState<CampaignRow[]>([])
  const [campaignSaving, setCampaignSaving] = useState<string | null>(null)

  const supabase = createClient()

  const loadSettingsData = useCallback(async () => {
    setLoading(true)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return

    setCurrentUser(authUser)

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (userData) {
      setProfile({
        name: userData.name || '',
        role: userData.role || 'cro',
        email: authUser.email || '',
      })
    }

    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (allUsers) setUsersList(allUsers)

    const [leadsRes, overridesRes] = await Promise.all([
      supabase.from('leads').select('source_campaign').limit(5000),
      supabase.from('campaign_entity_overrides').select('source_campaign, entity'),
    ])

    const overrideMap = new Map<string, Entity>(
      ((overridesRes.data || []) as { source_campaign: string; entity: string }[]).map(
        (o) => [o.source_campaign, o.entity as Entity]
      )
    )
    const counts = new Map<string, number>()
    for (const l of (leadsRes.data || []) as { source_campaign: string }[]) {
      counts.set(l.source_campaign, (counts.get(l.source_campaign) || 0) + 1)
    }
    const campaigns: CampaignRow[] = Array.from(counts.entries())
      .map(([source_campaign, leadCount]) => ({
        source_campaign,
        leadCount,
        entity: overrideMap.get(source_campaign) ?? getEntityForCampaign(source_campaign),
        isOverride: overrideMap.has(source_campaign),
      }))
      .sort((a, b) => b.leadCount - a.leadCount)
    setCampaignsList(campaigns)

    setLoading(false)
  }, [supabase])

  const handleSetCampaignEntity = async (sourceCampaign: string, entity: Entity) => {
    setCampaignSaving(sourceCampaign)
    const { error } = await supabase
      .from('campaign_entity_overrides')
      .upsert({ source_campaign: sourceCampaign, entity, updated_by: currentUser?.id || null })
    if (!error) {
      setCampaignsList((prev) =>
        prev.map((c) => (c.source_campaign === sourceCampaign ? { ...c, entity, isOverride: true } : c))
      )
    }
    setCampaignSaving(null)
  }

  useEffect(() => {
    loadSettingsData()
  }, [loadSettingsData])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.name) {
      return setMessage({ text: 'Nama Lengkap wajib diisi', type: 'error' })
    }
    if (!currentUser) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    const { error } = await supabase
      .from('users')
      .update({ name: profile.name })
      .eq('id', currentUser.id)

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setMessage({ text: 'Profil berhasil diperbarui!', type: 'success' })
      loadSettingsData()
    }
    setSaving(false)
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'owner'

  return (
    <>
      <Header
        title="Pengaturan"
        subtitle="Profil akun. Alur & kamus tahap ada di menu Cara pakai."
      />

      <div className="w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in font-sans">
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'profile' as const, label: 'Profil saya', icon: UserIcon },
            { id: 'users' as const, label: 'Kelola user', icon: Users, adminOnly: true },
            { id: 'campaigns' as const, label: 'Campaign', icon: Megaphone, adminOnly: true },
          ].map((tab) => {
            if (tab.adminOnly && !isAdmin) return null
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all text-left border',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}

          <Link
            href="/guide"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
          >
            <BookOpen size={14} />
            Cara pakai & alur →
          </Link>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-card rounded-2xl p-6 border border-border space-y-5"
            >
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                Profil saya
              </h2>

              {message.text && (
                <div
                  className={cn(
                    'p-3 rounded-xl text-xs font-semibold border',
                    message.type === 'error'
                      ? 'bg-red-50 border-red-100 text-red-700'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  )}
                >
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground font-semibold mb-1.5">
                    Email (sistem)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-muted text-muted-foreground/60 cursor-not-allowed border border-border"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground font-semibold mb-1.5">
                    Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile.role.toUpperCase()}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-muted text-muted-foreground/60 cursor-not-allowed border border-border font-semibold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-muted-foreground font-semibold mb-1.5">
                    Nama lengkap
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90"
              >
                {saving ? 'Menyimpan...' : 'Simpan perubahan'}
              </button>
            </form>
          )}

          {activeTab === 'users' && isAdmin && (
            <div className="bg-card rounded-2xl p-6 border border-border space-y-5">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Kelola user
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Ubah role: CRO (kerja harian), Owner (pantau), Admin (penuh).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">Nama</th>
                      <th className="py-2.5 px-3 font-semibold">Email</th>
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold">Dibuat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 px-3 font-semibold text-foreground">{u.name}</td>
                        <td className="py-3 px-3 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            disabled={u.id === currentUser?.id}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="px-2 py-1 bg-background text-foreground border border-border rounded-lg text-xs outline-none disabled:opacity-40"
                          >
                            <option value="cro">CRO</option>
                            <option value="owner">OWNER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && isAdmin && (
            <div className="bg-card rounded-2xl p-6 border border-border space-y-5">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Campaign → Entitas
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Campaign diisi bebas (tanpa dropdown) saat lead dibuat, jadi namanya bisa
                  macam-macam. Assign tiap nama campaign ke HNZ atau KFI di sini — dashboard
                  pakai pemetaan ini. Campaign baru yang belum di-assign (bertanda &quot;tebakan&quot;)
                  sementara ditebak dari kata &quot;driver&quot; di namanya.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">Nama campaign</th>
                      <th className="py-2.5 px-3 font-semibold">Jumlah lead</th>
                      <th className="py-2.5 px-3 font-semibold">Entitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaignsList.map((c) => (
                      <tr key={c.source_campaign}>
                        <td className="py-3 px-3 font-semibold text-foreground">{c.source_campaign}</td>
                        <td className="py-3 px-3 text-muted-foreground">{c.leadCount}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={c.entity}
                              disabled={campaignSaving === c.source_campaign}
                              onChange={(e) =>
                                handleSetCampaignEntity(c.source_campaign, e.target.value as Entity)
                              }
                              className="px-2 py-1 bg-background text-foreground border border-border rounded-lg text-xs outline-none disabled:opacity-40"
                            >
                              {ENTITIES.map((e) => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </select>
                            {!c.isOverride && (
                              <span className="text-[10px] text-muted-foreground italic">tebakan</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
