'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User as AuthUser } from '@supabase/supabase-js'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, User as UserIcon, Settings, Users, Target, Plus, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DBUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface BatchTarget {
  id: string
  batch_name: string
  target_seat_lock: number
  start_date: string
  closing_date: string
  notes: string | null
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'batches' | 'options'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  
  // Profile State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState({
    name: '',
    role: '',
    email: '',
  })

  // Admin states
  const [usersList, setUsersList] = useState<DBUser[]>([])
  const [batchesList, setBatchesList] = useState<BatchTarget[]>([])
  
  // Add batch target form state
  const [batchName, setBatchName] = useState('')
  const [targetSeatLock, setTargetSeatLock] = useState(28)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [batchNotes, setBatchNotes] = useState('')

  // Custom Dropdown Option state (stored in localStorage for simplicity & mock configuration)
  const [lostReasons, setLostReasons] = useState<string[]>([])
  const [newReason, setNewReason] = useState('')
  
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [newStatus, setNewStatus] = useState('')

  const supabase = createClient()

  const loadSettingsData = useCallback(async () => {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    setCurrentUser(authUser)

    // Load profile
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

    // Load admin users list
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (allUsers) {
      setUsersList(allUsers)
    }

    // Load batch targets
    const { data: allBatches } = await supabase
      .from('batch_targets')
      .select('*')
      .order('created_at', { ascending: false })

    if (allBatches) {
      setBatchesList(allBatches)
    }

    // Load custom options from localStorage
    const savedReasons = localStorage.getItem('ilusa_lost_reasons')
    if (savedReasons) {
      setLostReasons(JSON.parse(savedReasons))
    } else {
      const defaultReasons = [
        'Financial constraint / kendala biaya',
        'Belum siap berangkat',
        'Perlu diskusi keluarga',
        'Tidak memenuhi kualifikasi',
        'Tidak merespons',
        'Pilih program lain',
        'Lainnya'
      ]
      setLostReasons(defaultReasons)
      localStorage.setItem('ilusa_lost_reasons', JSON.stringify(defaultReasons))
    }

    const savedStatuses = localStorage.getItem('ilusa_status_options')
    if (savedStatuses) {
      setStatusOptions(JSON.parse(savedStatuses))
    } else {
      const defaultStatuses = [
        'New Lead',
        'Pitching',
        'Interested',
        'Not Interested',
        'Not Eligible',
        'Pemetaan Scheduled',
        'Waiting Result',
        'Sent Result Pemetaan',
        'Expert Consultation Scheduled',
        'Seat Lock Offered',
        'Seat Lock Paid',
        'Onboarding',
      ]
      setStatusOptions(defaultStatuses)
      localStorage.setItem('ilusa_status_options', JSON.stringify(defaultStatuses))
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadSettingsData()
  }, [loadSettingsData])

  // Save profile info
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
      .update({
        name: profile.name
      })
      .eq('id', currentUser.id)

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setMessage({ text: 'Profil berhasil diperbarui!', type: 'success' })
      loadSettingsData()
    }
    setSaving(false)
  }

  // Update user role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  // Create batch target
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchName) return

    const { data, error } = await supabase
      .from('batch_targets')
      .insert({
        batch_name: batchName,
        target_seat_lock: Number(targetSeatLock),
        start_date: startDate || new Date().toISOString().split('T')[0],
        closing_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: batchNotes || null
      })
      .select()

    if (!error && data) {
      setBatchesList(prev => [data[0], ...prev])
      setBatchName('')
      setBatchNotes('')
    }
  }

  // Delete batch target
  const handleDeleteBatch = async (id: string) => {
    const { error } = await supabase
      .from('batch_targets')
      .delete()
      .eq('id', id)

    if (!error) {
      setBatchesList(prev => prev.filter(b => b.id !== id))
    }
  }

  // Manage Lost Reasons CRUD
  const handleAddReason = () => {
    if (!newReason) return
    const updated = [...lostReasons, newReason]
    setLostReasons(updated)
    localStorage.setItem('ilusa_lost_reasons', JSON.stringify(updated))
    setNewReason('')
  }

  const handleDeleteReason = (idx: number) => {
    const updated = lostReasons.filter((_, i) => i !== idx)
    setLostReasons(updated)
    localStorage.setItem('ilusa_lost_reasons', JSON.stringify(updated))
  }

  // Manage Statuses CRUD
  const handleAddStatus = () => {
    if (!newStatus) return
    const updated = [...statusOptions, newStatus]
    setStatusOptions(updated)
    localStorage.setItem('ilusa_status_options', JSON.stringify(updated))
    setNewStatus('')
  }

  const handleDeleteStatus = (idx: number) => {
    const updated = statusOptions.filter((_, i) => i !== idx)
    setStatusOptions(updated)
    localStorage.setItem('ilusa_status_options', JSON.stringify(updated))
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
      <Header title="Pengaturan" subtitle="Kelola data profil dan preferensi CRM" />
      
      <div className="w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
        
        {/* Left Side: Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'profile', label: 'Profil Saya', icon: UserIcon },
            { id: 'users', label: 'Manage Users', icon: Users, adminOnly: true },
            { id: 'batches', label: 'Manage Batch Targets', icon: Target, adminOnly: true },
            { id: 'options', label: 'Manage CRM Options', icon: Settings, adminOnly: true }
          ].map(tab => {
            if (tab.adminOnly && !isAdmin) return null
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border",
                  activeTab === tab.id 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent dark:hover:bg-white/5"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Right Side: Tab Panel Content */}
        <div className="lg:col-span-3">
          
          {/* Tab 1: Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/5 space-y-5 shadow-xs">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Profil Saya</h2>

              {message.text && (
                <div className={cn(
                  "p-3 rounded-xl text-xs font-bold border",
                  message.type === 'error' 
                    ? "bg-red-50 border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400" 
                    : "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400"
                )}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Email (Sistem)</label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-muted text-muted-foreground/60 cursor-not-allowed border border-border dark:border-white/5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Role / Hak Akses</label>
                  <input
                    type="text"
                    disabled
                    value={profile.role.toUpperCase()}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-muted text-muted-foreground/60 cursor-not-allowed border border-border dark:border-white/5 font-extrabold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all duration-300 shadow-sm cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          )}

          {/* Tab 2: Manage Users (Admin only) */}
          {activeTab === 'users' && isAdmin && (
            <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/5 space-y-5 shadow-xs">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Manage Users</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                      <th className="py-2.5 px-3">Nama</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Tanggal Dibuat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-white/5">
                    {usersList.map(u => (
                       <tr key={u.id} className="hover:bg-muted/40 dark:hover:bg-white/[0.01]">
                        <td className="py-3 px-3 font-bold text-foreground">{u.name}</td>
                        <td className="py-3 px-3 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            disabled={u.id === currentUser?.id} // cannot change own role here
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="px-2 py-1 bg-background text-foreground border border-border rounded-lg text-xs outline-none cursor-pointer disabled:opacity-40 focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            <option value="cro" className="bg-card text-foreground">CRO</option>
                            <option value="owner" className="bg-card text-foreground">OWNER</option>
                            <option value="admin" className="bg-card text-foreground">ADMIN</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground/80">
                          {new Date(u.created_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Manage Batch Targets */}
          {activeTab === 'batches' && isAdmin && (
            <div className="space-y-6">
              
              {/* Add Batch Form */}
              <form onSubmit={handleAddBatch} className="bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Tambah Target Batch Baru</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Nama Batch</label>
                    <input
                      type="text"
                      placeholder="Contoh: Batch 2 Harunokaze"
                      value={batchName}
                      onChange={e => setBatchName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Target Seat Lock</label>
                    <input
                      type="number"
                      value={targetSeatLock}
                      onChange={e => setTargetSeatLock(Number(e.target.value))}
                      required
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Tanggal Berakhir</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Catatan</label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan target batch..."
                    value={batchNotes}
                    onChange={e => setBatchNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all duration-300 shadow-sm cursor-pointer"
                >
                  Tambah Batch Target
                </button>
              </form>

              {/* Batch Targets list */}
              <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Daftar Batch Target</h2>
                <div className="space-y-3">
                  {batchesList.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-white/5 bg-muted/20 dark:bg-white/[0.01]">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-foreground">{b.batch_name}</span>
                        <p className="text-[10px] text-muted-foreground">Periode: {b.start_date} s/d {b.closing_date}</p>
                        {b.notes && <p className="text-[10px] text-muted-foreground/80">{b.notes}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Target</span>
                          <p className="text-sm font-extrabold text-primary">{b.target_seat_lock} Seat Lock</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBatch(b.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 cursor-pointer dark:text-red-500/60 dark:hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 4: Manage Options */}
          {activeTab === 'options' && isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Lost Reasons options */}
              <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Manage Lost Reasons</h3>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tambah alasan baru..."
                    value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={handleAddReason}
                    className="px-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {lostReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border dark:bg-white/[0.01] dark:border-white/5 text-[11px] text-muted-foreground">
                      <span>{reason}</span>
                      <button
                        onClick={() => handleDeleteReason(idx)}
                        className="text-red-600 hover:text-red-700 dark:text-red-500/60 dark:hover:text-red-400 p-0.5 cursor-pointer transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status options */}
              <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Manage Pipeline Status</h3>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tambah status baru..."
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={handleAddStatus}
                    className="px-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {statusOptions.map((status, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border dark:bg-white/[0.01] dark:border-white/5 text-[11px] text-muted-foreground">
                      <span>{status}</span>
                      <button
                        onClick={() => handleDeleteStatus(idx)}
                        className="text-red-600 hover:text-red-700 dark:text-red-500/60 dark:hover:text-red-400 p-0.5 cursor-pointer transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </>
  )
}
