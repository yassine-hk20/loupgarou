import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import english from './locales/en/translation.json'
import englishRoles from './locales/en/roles.json'
import arabic from './locales/ar/translation.json'
import arabicRoles from './locales/ar/roles.json'

const languageStorageKey = 'loupgarou-language'
const savedLanguage = window.localStorage.getItem(languageStorageKey)

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: english, roles: englishRoles },
    ar: { translation: arabic, roles: arabicRoles },
  },
  lng: savedLanguage === 'ar' ? 'ar' : 'en',
  fallbackLng: 'en',
  defaultNS: 'translation',
  ns: ['translation', 'roles'],
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (language) => {
  const nextLanguage = language === 'ar' ? 'ar' : 'en'
  document.documentElement.lang = nextLanguage
  document.documentElement.dir = nextLanguage === 'ar' ? 'rtl' : 'ltr'
  window.localStorage.setItem(languageStorageKey, nextLanguage)
})

document.documentElement.lang = i18n.language === 'ar' ? 'ar' : 'en'
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

export default i18n