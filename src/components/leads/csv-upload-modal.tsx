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
    // Assuming format DD/MM/YYYY
    const parts = String(dateStr).split('/')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00+07:00`
    }
    return new Date().toISOString()
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

    const supabase = createClient()
    const { data: authData } = await supabase.auth.getUser()
    const actorId = authData.user?.id || null

    let successCount = 0
    let failedCount = 0

    // Process row by row to prevent one duplicate from failing the whole batch
    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i]
      
      const whatsapp = normalizePhone(row['Nomor HP'] || '')
      if (!whatsapp || !row['Nama']) {
        failedCount++
        setUploadProgress(prev => ({ ...prev, current: i + 1, failed: failedCount }))
        continue
      }

      const assignedId = findCroId(row['PIC CRO'])
      const entryDate = parseDateString(row['Tanggal Lead Masuk'])

      const leadData = {
        full_name: row['Nama'],
        whatsapp_number: whatsapp,
        whatsapp_normalized: whatsapp, // this has unique constraint
        source_campaign: row['Source Campaign'] || 'Organic',
        current_status: row['Status Pipeline'] || 'New Lead',
        assigned_cro_id: assignedId,
        lead_entry_date: entryDate,
        created_by: actorId,
        updated_by: actorId
      }

      const { error } = await supabase.from('leads').insert(leadData)
      
      if (error) {
        failedCount++
      } else {
        successCount++
      }
      setUploadProgress(prev => ({ ...prev, current: i + 1, success: successCount, failed: failedCount }))
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
            <p className="text-xs text-muted-foreground mt-1">Upload data prospek dalam jumlah besar (Bulk Import)</p>
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
                    <p className="text-xs text-muted-foreground mt-1">Pastikan format kolom sesuai dengan master template (Nama, Nomor HP, dll)</p>
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
                                  <td className="px-4 py-2 text-foreground font-medium">{row['Nama']}</td>
                                  <td className="px-4 py-2 text-foreground">{row['Nomor HP']}</td>
                                  <td className="px-4 py-2 text-foreground">{row['Status Pipeline']}</td>
                                  <td className="px-4 py-2 text-foreground">{row['Source Campaign']}</td>
                                  <td className="px-4 py-2 text-foreground">{row['PIC CRO']}</td>
                                  <td className="px-4 py-2 text-foreground">{row['Tanggal Lead Masuk']}</td>
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
