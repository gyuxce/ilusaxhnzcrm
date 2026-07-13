'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'en' | 'id'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const savedLang = window.localStorage.getItem('crm.lang') || window.localStorage.getItem('crm.dashboard.lang')
    if (savedLang === 'en' || savedLang === 'id') {
      setLangState(savedLang)
    }
  }, [])

  const setLang = (nextLang: Language) => {
    setLangState(nextLang)
    window.localStorage.setItem('crm.lang', nextLang)
    window.localStorage.setItem('crm.dashboard.lang', nextLang)
    document.documentElement.lang = nextLang === 'id' ? 'id' : 'en'
  }

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    toggleLang: () => setLang(lang === 'en' ? 'id' : 'en'),
  }), [lang])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}
