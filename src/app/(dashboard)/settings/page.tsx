'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { Loader2, User, Phone, Mail, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({
    full_name: '',
    wa_number: '',
    role: '',
    email: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      setUser(authUser)

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setProfile({
          full_name: userData.full_name || '',
          wa_number: userData.wa_number || '',
          role: userData.role || 'cro',
          email: authUser.email || '',
        })
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile.full_name) {
      return setMessage({ text: 'Nama Lengkap wajib diisi', type: 'error' })
    }

    setSaving(true)
    setMessage({ text: '', type: '' })

    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({
        full_name: profile.full_name,
        wa_number: profile.wa_number || null,
      })
      .eq('id', user.id)

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setMessage({ text: 'Profil berhasil diperbarui!', type: 'success' })
    }
    setSaving(false)
  }

  const inputClass = "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
  const inputStyle = { background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    )
  }

  return (
    <>
      <Header title="Pengaturan" subtitle="Kelola informasi profil kamu" />
      <div className="p-6 max-w-xl animate-fade-in">
        <form onSubmit={handleSave} className="glass-card rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white mb-2">Informasi Akun</h2>

          {message.text && (
            <div
              className={cn(
                "p-3.5 rounded-xl text-xs font-medium border animate-fade-in",
                message.type === 'error'
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-green-500/10 border-green-500/20 text-green-400"
              )}
            >
              {message.text}
            </div>
          )}

          {/* Email (Read Only) */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Email (Sistem)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-white/30">
                <Mail size={16} />
              </span>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white/40 outline-none cursor-not-allowed"
                style={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,47%,15%)' }}
              />
            </div>
          </div>

          {/* Role (Read Only) */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Role / Jabatan</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-white/30">
                <ShieldAlert size={16} />
              </span>
              <input
                type="text"
                disabled
                value={profile.role.toUpperCase()}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white/40 outline-none cursor-not-allowed font-semibold"
                style={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,47%,15%)' }}
              />
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-white/30">
                <User size={16} />
              </span>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Masukkan nama lengkap"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Nomor WhatsApp</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-white/30">
                <Phone size={16} />
              </span>
              <input
                type="text"
                value={profile.wa_number}
                onChange={(e) => setProfile(prev => ({ ...prev, wa_number: e.target.value }))}
                placeholder="Masukkan nomor WA (misal: 0812xxxxxxxx)"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:glow-purple flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
