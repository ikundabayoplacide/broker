"use client";

import React, { useState, useRef, useEffect } from 'react';
import { HiOutlineChevronDown, HiOutlineGlobeAlt } from 'react-icons/hi';
import { useTranslation } from './TranslationProvider';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
];

interface LanguageSelectorProps {
  className?: string;
}

const getCurrentLanguageFromCookie = (): string => {
  if (typeof document === 'undefined') return 'en';
  
  const cookies = document.cookie.split(';');
  const googleTransCookie = cookies.find(cookie => 
    cookie.trim().startsWith('googtrans=')
  );
  
  if (googleTransCookie) {
    const value = googleTransCookie.split('=')[1];
    if (value && value.includes('/')) {
      const langCode = value.split('/')[2];
      return langCode || 'en';
    }
  }
  
  return 'en';
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const currentLang = getCurrentLanguageFromCookie();
    return languages.find(lang => lang.code === currentLang) || languages[0];
  });
  const { changeLanguage } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Update selected language when page loads or cookie changes
    const updateLanguage = () => {
      const currentLang = getCurrentLanguageFromCookie();
      const foundLang = languages.find(lang => lang.code === currentLang);
      if (foundLang && foundLang.code !== selectedLanguage.code) {
        setSelectedLanguage(foundLang);
      }
    };

    updateLanguage();
    
    // Check for language changes periodically
    const interval = setInterval(updateLanguage, 1000);
    return () => clearInterval(interval);
  }, [selectedLanguage.code]);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setIsOpen(false);
    changeLanguage(language.code);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-[#006b7d] transition-colors duration-200 border border-gray-300 rounded-lg hover:border-[#006b7d]"
      >
        <HiOutlineGlobeAlt className="h-4 w-4" />
        <span className="hidden sm:inline">{selectedLanguage.name}</span>
        <span className="sm:hidden">{selectedLanguage.flag}</span>
        <HiOutlineChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors duration-200 ${
                selectedLanguage.code === language.code ? 'bg-blue-50 text-[#006b7d]' : 'text-gray-700'
              } ${language === languages[0] ? 'rounded-t-lg' : ''} ${
                language === languages[languages.length - 1] ? 'rounded-b-lg' : ''
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};