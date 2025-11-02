"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import en from '@/lib/locales/en.json';
import hi from '@/lib/locales/hi.json';

const translations = { en, hi };

type Locale = 'en' | 'hi';

type TranslationContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof en) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = useMemo(() => (key: keyof typeof en): string => {
    return translations[locale][key] || translations['en'][key] || key;
  }, [locale]);

  const value = {
    locale,
    setLocale,
    t,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
