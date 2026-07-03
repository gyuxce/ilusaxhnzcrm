'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { X, UploadCloud, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface CsvUploadModalProps {
  isOpen: boolean
  onClose: () => void
  pics: { id: string; name: string; email?: string }[]
}

export function CsvUploadModal({ isOpen, onClose, pics }: CsvUploadModalProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const [failedRows, setFailedRows] = useState<string[]>([])
  const [defaultCampaign, setDefaultCampaign] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const normalizePhone = (value: string) => {
    if (!value) return ''
    let cleanPhone = String(value).replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone
    }
    return cleanPhone
  }

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return null
    const cleanDate = String(dateStr).trim()
    const parts = cleanDate.split(/[/-]/)
    if (parts.length === 3) {
      const day = Number(parts[0])
      const month = Number(parts[1])
      let year = Number(parts[2])
      if (!day || !month || !year) return null
      if (year < 100) year += year >= 70 ? 1900 : 2000
      const parsed = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`)
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
    }
    const parsed = new Date(cleanDate)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  const getField = (row: any, aliases: string[]) => {
    const entries = Object.entries(row || {})
    const normalizeHeader = (value: string) =>
      String(value)
        .replace(/^\uFEFF/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias)
      const found = entries.find(([key]) => normalizeHeader(key) === normalizedAlias)
      if (found && found[1] !== undefined && found[1] !== null && String(found[1]).trim() !== '') {
        return String(found[1]).trim()
      }
    }
    return ''
  }

  const findCroId = (identifier: string) => {
    if (!identifier) return null
    const lowerId = String(identifier).toLowerCase().trim()
    const found = pics.find(
      p => p.email?.toLowerCase() === lowerId || p.name.toLowerCase().includes(lowerId)
    )
    return found ? found.id : null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('')
    setParsedData([])
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setErrorMsg('Harap pilih file berformat .csv')
        return
      }
      setFile(selectedFile)
      setIsParsing(true)
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedData(results.data as any[])
          setIsParsing(false)
        },
        error: (error: any) => {
          setErrorMsg('Gagal membaca CSV: ' + error.message)
          setIsParsing(false)
        }
      })
    }
  }

  const startUpload = async () => {
    if (parsedData.length === 0) return
    setIsUploading(true)
    setUploadProgress({ current: 0, total: parsedData.length, success: 0, failed: 0 })
    setErrorMsg('')
    setFailedRows([])

    const supabase = createClient()

    let successCount = 0
    let failedCount = 0
    const failures: string[] = []

    const importRow = async (row: any, i: number) => {
      try {
        const whatsapp = normalizePhone(getField(row, [
          'Nomor HP',
          'No. HP',
          'No HP',
          'No Hp',
          'HP',
          'Handphone',
          'No Telepon',
          'Telepon',
          'No Handphone',
          'Nomor WhatsApp',
          'WhatsApp',
          'Whatsapp',
          'WA',
          'Phone',
          'Nomor',
        ]))
        if (!whatsapp) {
          return { ok: false, message: `Baris ${i + 1}: nomor WhatsApp kosong/tidak terbaca.` }
        }

        const fullName = getField(row, ['Nama', 'Name', 'Full Name', 'Nama Lengkap', 'Nama Lead']) || `Lead ${whatsapp}`
        const sourceCampaign = getField(row, ['Source Campaign', 'Campaign', 'Campaign Name', 'Nama Campaign', 'Source']) || 'Ads Import'
        const assignedId = findCroId(getField(row, ['PIC CRO', 'PIC', 'CRO', 'Assigned CRO']))
        const entryDate = parseDateString(getField(row, ['Tanggal Lead Masuk', 'Tanggal Masuk', 'Lead Entry Date', 'Date']))
        const status = getField(row, ['Status Pipeline', 'Status', 'Current Status']) || 'New Lead'

        const { data, error } = await supabase.rpc('create_lead_fast', {
          p_full_name: fullName,
          p_whatsapp_number: whatsapp,
          p_email: null,
          p_source_campaign: sourceCampaign,
          p_lead_type: 'inbound',
          p_current_status: status,
          p_assigned_cro_id: assignedId,
          p_notes: 'Imported from CSV',
          p_lead_entry_date: entryDate || new Date().toISOString(),
        })
        
        if (error || !data?.ok) {
          const reason = error?.message || data?.message || 'Gagal menyimpan lead.'
          return { ok: false, message: `Baris ${i + 1} (${fullName} / ${whatsapp}): ${reason}` }
        }

        return { ok: true, message: '' }
      } catch (error: any) {
        return { ok: false, message: `Baris ${i + 1}: ${error?.message || 'Gagal membaca/menyimpan baris ini.'}` }
      }
    }

    const batchSize = 10

    for (let start = 0; start < parsedData.length; start += batchSize) {
      const batch = parsedData.slice(start, start + batchSize)
      const results = await Promise.all(batch.map((row, offset) => importRow(row, start + offset)))

      results.forEach(result => {
        if (result.ok) {
          successCount++
        } else {
          failedCount++
          failures.push(result.message)
        }
      })

      setFailedRows(failures.slice(0, 8))
      setUploadProgress({
        current: Math.min(start + batch.length, parsedData.length),
        total: parsedData.length,
        success: successCount,
        failed: failedCount,
      })
    }

    setIsUploading(false)
    if (successCount > 0) {
      router.refresh()
    }
  }

  const resetModal = () => {
    setFile(null)
    setParsedData([])
    setIsUploading(false)
    setErrorMsg('')
    setFailedRows([])
    setUploadProgress({ current: 0, total: 0, success: 0, failed: 0 })
  }

  if (!isOpen) return null

  const isFinished = uploadProgress.total > 0 && uploadProgress.current === uploadProgress.total

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Import Leads via CSV</h2>
            <p className="text-xs text-muted-foreground mt-1">Upload data prospek massal. Minimal cukup nomor WhatsApp; nama bisa otomatis dibuat.</p>
          </div>
          <button 
            onClick={() => {
              resetModal()
              onClose()
            }} 
            disabled={isUploading}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-muted-foreground transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isFinished ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Import Selesai!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Berhasil menyimpan <strong className="text-emerald-600 dark:text-emerald-400">{uploadProgress.success}</strong> lead baru.
                  <br/>
                  Gagal / Duplikat: <strong className="text-red-500">{uploadProgress.failed}</strong> baris.
                </p>
              </div>
              {failedRows.length > 0 && (
                <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-4 text-left dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-300">Contoh baris gagal</p>
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-red-700 dark:text-red-300">
                    {failedRows.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              <button
                onClick={() => {
                  resetModal()
                  onClose()
                }}
                className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 transition-all"
              >
                Tutup & Muat Ulang Halaman
              </button>
            </div>
          ) : (
            <>
              {/* Upload Zone */}
              {!file && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border hover:border-primary/50 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <UploadCloud size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">Klik untuk memilih file CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format fleksibel: minimal kolom Nomor HP. Kolom aman: Nama, Nomor HP, Source Campaign, Status Pipeline, PIC CRO, Tanggal Lead Masuk.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{errorMsg}</p>
                </div>
              )}

              <div className="hidden rounded-2xl border border-border bg-slate-50/60 p-4 dark:bg-white/[0.02]">
                <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Default Campaign Import</label>
                <input
                  value={defaultCampaign}
                  onChange={event => setDefaultCampaign(event.target.value)}
                  placeholder="Contoh: Campaign Webinar Special, Ads Juli, Campaign Construction Batch 2..."
                  className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  disabled={isUploading}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Jika CSV tidak punya kolom campaign, semua lead akan memakai campaign ini. Jika tetap kosong, sistem memakai “Ads Import”.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                Campaign diambil dari kolom <strong>Source Campaign</strong> pada CSV. Jika ada baris tanpa campaign, sistem otomatis mengisi <strong>Ads Import</strong>.
              </div>

              {/* Preview & Progress */}
              {file && !errorMsg && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <UploadCloud size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isParsing ? 'Sedang membaca file...' : `${parsedData.length} baris data terdeteksi`}
                        </p>
                      </div>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={resetModal}
                        className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  {isUploading && (
                    <div className="space-y-2 p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.02]">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground">Progres Import...</span>
                        <span className="text-primary">{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Sukses: <strong className="text-emerald-500">{uploadProgress.success}</strong> | Gagal/Duplikat: <strong className="text-red-500">{uploadProgress.failed}</strong>
                      </p>
                    </div>
                  )}

                  {!isUploading && parsedData.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preview 5 Baris Pertama</h3>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-border">
                              <tr>
                                <th className="px-4 py-3 font-semibold text-muted-foreground">Nama</th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground">Nomor HP</th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground">Status Pipeline</th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground">Campaign</th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground">PIC</th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground">Tanggal Masuk</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {parsedData.slice(0, 5).map((row, idx) => (
                                <tr key={idx} className="bg-card hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                  <td className="px-4 py-2 text-foreground font-medium">
                                    {getField(row, ['Nama', 'Name', 'Full Name', 'Nama Lengkap', 'Nama Lead']) || 'Auto dari nomor'}
                                  </td>
                                  <td className="px-4 py-2 text-foreground">
                                    {getField(row, ['Nomor HP', 'No. HP', 'No HP', 'No Hp', 'HP', 'Handphone', 'No Telepon', 'Telepon', 'No Handphone', 'Nomor WhatsApp', 'WhatsApp', 'Whatsapp', 'WA', 'Phone', 'Nomor']) || '-'}
                                  </td>
                                  <td className="px-4 py-2 text-foreground">{getField(row, ['Status Pipeline', 'Status', 'Current Status']) || 'New Lead'}</td>
                                  <td className="px-4 py-2 text-foreground">{getField(row, ['Source Campaign', 'Campaign', 'Campaign Name', 'Nama Campaign', 'Source']) || 'Ads Import'}</td>
                                  <td className="px-4 py-2 text-foreground">{getField(row, ['PIC CRO', 'PIC', 'CRO', 'Assigned CRO']) || '-'}</td>
                                  <td className="px-4 py-2 text-foreground">{getField(row, ['Tanggal Lead Masuk', 'Tanggal Masuk', 'Lead Entry Date', 'Date']) || 'Hari ini'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isFinished && (
          <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={() => {
                resetModal()
                onClose()
              }}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={startUpload}
              disabled={!file || parsedData.length === 0 || isUploading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mengimpor...
                </>
              ) : (
                'Mulai Import Data'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
