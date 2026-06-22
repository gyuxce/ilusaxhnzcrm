'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Coba lagi.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, hsl(250,50%,12%) 0%, hsl(222,47%,5%) 60%)',
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'hsl(250,84%,65%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'hsl(280,60%,55%)' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl p-8 glass-card"
          style={{ border: '1px solid rgba(139,92,246,0.15)' }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 glow-purple"
              style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
            >
              <Zap size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ILUSA CRM</h1>
            <p className="text-sm text-white/40 mt-1">Harunokaze × Wiwitan</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@ilusa.com"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
                style={{
                  background: 'hsl(222,47%,12%)',
                  border: '1px solid hsl(222,47%,20%)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'hsl(250,84%,65%)')}
                onBlur={(e) => (e.target.style.borderColor = 'hsl(222,47%,20%)')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
                  style={{
                    background: 'hsl(222,47%,12%)',
                    border: '1px solid hsl(222,47%,20%)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'hsl(250,84%,65%)')}
                  onBlur={(e) => (e.target.style.borderColor = 'hsl(222,47%,20%)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-2.5 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading
                  ? 'hsl(222,47%,20%)'
                  : 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))',
              }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-xs text-white/25 mt-6">
            Butuh akses? Hubungi admin tim CRO
          </p>
        </div>
      </div>
    </div>
  )
}
