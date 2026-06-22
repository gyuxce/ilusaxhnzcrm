'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, MessageCircle, Loader2, Copy, Check } from 'lucide-react'
import { generateWALink } from '@/lib/utils'

interface WhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  leadName: string
  leadPhone: string
  picName?: string
}

export function WhatsAppModal({ isOpen, onClose, leadName, leadPhone, picName = 'Tim CRO' }: WhatsAppModalProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [messageText, setMessageText] = useState('')
  const [copied, setCopied] = useState(false)

  // Fetch scripts from playbook
  useEffect(() => {
    if (!isOpen) return

    async function fetchTemplates() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('playbook_items')
        .select('*')
        .eq('category', 'script')
        .eq('is_active', true)

      if (data && data.length > 0) {
        setTemplates(data)
        // Select first by default
        setSelectedTemplateId(data[0].id)
        generatePreview(data[0].content)
      } else {
        // Fallback default message if no playbook items exist
        const defaultText = `Halo Kak ${leadName}, saya ${picName} dari ILUSA. Bagaimana kabarnya?`
        setMessageText(defaultText)
      }
      setLoading(false)
    }

    fetchTemplates()
  }, [isOpen, leadName, picName])

  function getGreeting() {
    const hours = new Date().getHours()
    if (hours < 11) return 'pagi'
    if (hours < 15) return 'siang'
    if (hours < 19) return 'sore'
    return 'malam'
  }

  function generatePreview(content: string) {
    const greeting = getGreeting()
    let preview = content
      .replace(/\[Nama\]/g, leadName)
      .replace(/\[Nama Lead\]/g, leadName)
      .replace(/\[Nama PIC\]/g, picName)
      .replace(/\[pagi\/siang\/sore\]/g, greeting)
      .replace(/\[pagi\/siang\/sore\/malam\]/g, greeting)
    setMessageText(preview)
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId)
    const t = templates.find(item => item.id === templateId)
    if (t) {
      generatePreview(t.content)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(messageText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSend() {
    const waLink = generateWALink(leadPhone, messageText)
    window.open(waLink, '_blank', 'noopener,noreferrer')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-purple-400">
            <MessageCircle size={18} />
            <h3 className="font-bold text-white text-sm">Kirim Pesan WhatsApp</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Lead Info */}
          <div className="p-3.5 rounded-xl text-xs space-y-1" style={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,47%,15%)' }}>
            <p className="text-white/40">Mengirim ke:</p>
            <p className="font-bold text-white text-sm">{leadName}</p>
            <p className="font-mono text-white/50 text-xs">{leadPhone}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-purple-500" size={24} />
            </div>
          ) : (
            <>
              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Pilih Template Playbook</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none transition-all cursor-pointer"
                    style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Message Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-white/50">Edit Isi Pesan</label>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-green-400" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Salin Pesan
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all font-sans leading-relaxed resize-none"
                  style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !messageText}
            className="px-5 py-2 text-xs font-semibold rounded-xl text-white hover:glow-purple transition-all duration-300 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))',
            }}
          >
            <MessageCircle size={14} />
            Buka WhatsApp
          </button>
        </div>

      </div>
    </div>
  )
}
