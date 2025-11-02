"use client";

import { useTranslation } from './provider';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'hi' : 'en');
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleLocale}>
      {locale === 'en' ? 'हिंदी' : 'English'}
    </Button>
  );
}
