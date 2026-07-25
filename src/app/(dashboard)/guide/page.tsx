'use client'

import { Header } from '@/components/layout/header'
import { GUIDE, GUIDE_SECTIONS_ID } from '@/lib/guide-content'
import { SIMPLE_FUNNEL_FLOW } from '@/lib/brand'
import { useLanguage } from '@/lib/language'
import { BookOpen } from 'lucide-react'

export default function GuidePage() {
  const { lang } = useLanguage()
  const title = lang === 'en' ? GUIDE.titleEn : GUIDE.titleId
  const subtitle = lang === 'en' ? GUIDE.subtitleEn : GUIDE.subtitleId

  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="w-full p-5 sm:p-6 space-y-5 animate-fade-in font-sans max-w-4xl">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-accent" />
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              {SIMPLE_FUNNEL_FLOW.titleId}
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Baca halaman ini dulu kalau ada pertanyaan soal menu atau angka di Dashboard.
            Semua penjelasan di bawah memakai bahasa sederhana untuk tim & klien.
          </p>
        </div>

        {GUIDE_SECTIONS_ID.map((section) => (
          <section key={section.id} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>

            {'intro' in section && section.intro && (
              <p className="text-sm text-muted-foreground leading-relaxed">{section.intro}</p>
            )}

            {'body' in section &&
              section.body.map((block) => (
                <div key={block.heading}>
                  <p className="text-xs font-semibold text-accent mb-1.5">{block.heading}</p>
                  <ul className="space-y-1.5">
                    {block.points.map((point) => (
                      <li key={point} className="text-sm text-foreground leading-relaxed pl-3 border-l-2 border-border">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {'steps' in section && (
              <ol className="space-y-2">
                {section.steps.map((step) => (
                  <li key={step} className="text-sm font-medium text-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            )}

            {'exit' in section && section.exit && (
              <p className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground leading-relaxed">
                {section.exit}
              </p>
            )}

            {'cro' in section && section.cro && (
              <p className="text-sm text-muted-foreground leading-relaxed">{section.cro}</p>
            )}

            {'tabs' in section &&
              section.tabs.map((tab) => (
                <div key={tab.name} className="rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">{tab.name}</p>
                  <ul className="space-y-1.5">
                    {tab.items.map((item) => (
                      <li key={item} className="text-[13px] text-muted-foreground leading-relaxed">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {'points' in section && (
              <ul className="space-y-2">
                {section.points.map((point) => (
                  <li key={point} className="text-sm text-foreground leading-relaxed pl-3 border-l-2 border-border">
                    {point}
                  </li>
                ))}
              </ul>
            )}

            {'faqs' in section &&
              section.faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl border border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{faq.q}</p>
                  <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
          </section>
        ))}
      </div>
    </>
  )
}
