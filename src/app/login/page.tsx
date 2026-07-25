'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { PRODUCT } from '@/lib/brand'

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
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-32 right-[-10%] w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40"
          style={{ background: 'var(--surface-glow)' }}
        />
        <div
          className="absolute -bottom-40 left-[-8%] w-[26rem] h-[26rem] rounded-full blur-3xl opacity-50"
          style={{ background: 'var(--surface-glow-accent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="rounded-2xl p-8 sm:p-9 bg-card text-card-foreground border border-border shadow-sm">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-card border border-border overflow-hidden">
              <Image
                src="/harunokaze-logo.jpg"
                alt={PRODUCT.shortName}
                width={64}
                height={64}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent mb-2">
              {PRODUCT.partnership}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {PRODUCT.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
              {PRODUCT.taglineId}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@harunokaze.com"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-background text-foreground border border-border outline-none transition-colors placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
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
                  className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-background text-foreground border border-border outline-none transition-colors placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-xl text-sm bg-destructive/8 border border-destructive/20 text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:opacity-92 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Masuk...' : 'Masuk ke workspace'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            Butuh akses? Hubungi admin tim CRO
          </p>
        </div>
      </div>
    </div>
  )
}
