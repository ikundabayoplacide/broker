"use client";

import React, { createContext, useEffect, useRef, useContext } from 'react';

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

interface TranslationContextType {
  changeLanguage: (lang: string) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const useGoogleTranslateScript = (originalLang: string) => {
  useEffect(() => {
    const scriptId = 'google-translate-script';
    if (document.getElementById(scriptId)) {
      return;
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(script);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: originalLang,
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');
    };
  }, [originalLang]);
};

interface TranslationProviderProps {
  children: React.ReactNode;
  originalLang?: string;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ 
  children, 
  originalLang = 'en' 
}) => {
  const googleTranslateElementRef = useRef<HTMLDivElement>(null);

  useGoogleTranslateScript(originalLang);

  useEffect(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
      iframe.VIpgJd-ZVi9od-ORHb-OEVmcd.skiptranslate {
        display: none !important;
        visibility: hidden !important;
      }
      .VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc {
        display: none !important;
        visibility: hidden !important;
      }
      .goog-te-banner-frame {
        display: none !important;
      }
      .goog-te-menu-value {
        display: none !important;
      }
      .goog-tooltip {
        display: none !important;
      }
      .goog-tooltip:hover {
        display: none !important;
      }
      .goog-text-highlight {
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      body {
        position: static !important;
        min-height: 0 !important;
        top: 0 !important;
      }
    `;
    document.head.appendChild(style);

    // Hide Google Translate tooltips and feedback
    const hideGoogleElements = () => {
      const elements = document.querySelectorAll('.goog-tooltip, .goog-te-banner-frame, [id*="goog-gt-"]');
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        }
      });
    };

    const observer = new MutationObserver(hideGoogleElements);
    observer.observe(document.body, { childList: true, subtree: true });
    hideGoogleElements();

    return () => {
      observer.disconnect();
      try {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      } catch (error) {
        // Ignore errors if the element was already removed
      }
    };
  }, []);

  const changeLanguage = (lang: string) => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const topLevel = parts.slice(-2).join('.');
    const subDomains = parts.slice(0, -2);
    const domains = subDomains.reduce((acc: string[], part, index) => {
      const subDomain = acc[index - 1] ? acc[index - 1] + '.' + part : part + '.' + topLevel;
      acc.push(subDomain);
      return acc;
    }, [topLevel]);

    domains.forEach(domain => {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.${domain}; path=/`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; path=/`;
    });

    document.cookie = `googtrans=/auto/${lang}; path=/;`;
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <TranslationContext.Provider value={{ changeLanguage }}>
      {children}
      <div style={{ display: "none" }} ref={googleTranslateElementRef} id="google_translate_element" />
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};