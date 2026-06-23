'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { WhatsAppModal } from './WhatsAppModal'

interface WhatsAppButtonProps {
  leadName: string
  leadPhone: string
  picName?: string
  iconOnly?: boolean
}

export function WhatsAppButton({ leadName, leadPhone, picName, iconOnly = false }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {iconOnly ? (
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors outline-none cursor-pointer flex items-center justify-center"
          title="Kirim Template WA"
        >
          <MessageCircle size={13} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] text-left outline-none cursor-pointer border border-emerald-250/20 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10"
        >
          <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-405 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-650 dark:text-emerald-400">Buka WhatsApp</p>
            <p className="text-xs text-muted-foreground">Kirim template playbook</p>
          </div>
        </button>
      )}

      <WhatsAppModal
        isOpen={open}
        onClose={() => setOpen(false)}
        leadName={leadName}
        leadPhone={leadPhone}
        picName={picName}
      />
    </>
  )
}
