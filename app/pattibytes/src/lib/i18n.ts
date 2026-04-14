/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

const LANG_KEY = 'app_lang'

// ── Translations ──────────────────────────────────────────────────────────────
const resources = {
  en: {
    translation: {
      // Common
      'app.greeting':         'Hey {{name}} 👋',
      'app.craving':          'What are you craving today?',
      'app.deliverTo':        'DELIVER TO',
      'app.change':           'Change',
      'app.search':           'Search restaurants, dishes…',
      'app.noResults':        'No results found',
      // Dashboard sections
      'section.quickActions': 'Quick Actions',
      'section.categories':   'Shop by Category',
      'section.deals':        'Global Deals',
      'section.orders':       'Active Orders',
      'section.trending':     'Trending Now',
      'section.restaurants':  'Restaurants',
      // Location
      'location.title':       'Change Location',
      'location.current':     'Current Location',
      'location.gps':         'Use my current location (GPS)',
      'location.detecting':   'Detecting…',
      'location.placeholder': 'Search city, area…',
      // Settings
      'settings.title':       'Settings',
      'settings.theme':       'Theme',
      'settings.language':    'Language',
      'settings.light':       'Light',
      'settings.dark':        'Dark',
      'settings.system':      'System',
      'settings.save':        'Save',
    },
  },
  hi: {
    translation: {
      'app.greeting':         'नमस्ते {{name}} 👋',
      'app.craving':          'आज क्या खाना है?',
      'app.deliverTo':        'डिलीवरी यहाँ',
      'app.change':           'बदलें',
      'app.search':           'रेस्टोरेंट, व्यंजन खोजें…',
      'app.noResults':        'कोई परिणाम नहीं',
      'section.quickActions': 'त्वरित क्रियाएं',
      'section.categories':   'श्रेणी के अनुसार',
      'section.deals':        'ऑफर्स',
      'section.orders':       'सक्रिय ऑर्डर',
      'section.trending':     'ट्रेंडिंग',
      'section.restaurants':  'रेस्टोरेंट',
      'location.title':       'स्थान बदलें',
      'location.current':     'वर्तमान स्थान',
      'location.gps':         'GPS से स्थान प्राप्त करें',
      'location.detecting':   'पता लगा रहे हैं…',
      'location.placeholder': 'शहर, क्षेत्र खोजें…',
      'settings.title':       'सेटिंग्स',
      'settings.theme':       'थीम',
      'settings.language':    'भाषा',
      'settings.light':       'लाइट',
      'settings.dark':        'डार्क',
      'settings.system':      'सिस्टम',
      'settings.save':        'सहेजें',
    },
  },
  pa: {
    translation: {
      'app.greeting':         'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {{name}} 👋',
      'app.craving':          'ਅੱਜ ਕੀ ਖਾਣਾ ਹੈ?',
      'app.deliverTo':        'ਡਿਲੀਵਰੀ ਇੱਥੇ',
      'app.change':           'ਬਦਲੋ',
      'app.search':           'ਰੈਸਟੋਰੈਂਟ ਖੋਜੋ…',
      'app.noResults':        'ਕੋਈ ਨਤੀਜਾ ਨਹੀਂ',
      'section.quickActions': 'ਤੇਜ਼ ਕਾਰਵਾਈਆਂ',
      'section.categories':   'ਸ਼੍ਰੇਣੀ ਅਨੁਸਾਰ',
      'section.deals':        'ਆਫਰ',
      'section.orders':       'ਸਰਗਰਮ ਆਰਡਰ',
      'section.trending':     'ਟ੍ਰੈਂਡਿੰਗ',
      'section.restaurants':  'ਰੈਸਟੋਰੈਂਟ',
      'location.title':       'ਸਥਾਨ ਬਦਲੋ',
      'location.current':     'ਮੌਜੂਦਾ ਸਥਾਨ',
      'location.gps':         'GPS ਤੋਂ ਸਥਾਨ ਲਓ',
      'location.detecting':   'ਲੱਭ ਰਹੇ ਹਾਂ…',
      'location.placeholder': 'ਸ਼ਹਿਰ ਖੋਜੋ…',
      'settings.title':       'ਸੈਟਿੰਗਜ਼',
      'settings.theme':       'ਥੀਮ',
      'settings.language':    'ਭਾਸ਼ਾ',
      'settings.light':       'ਲਾਈਟ',
      'settings.dark':        'ਡਾਰਕ',
      'settings.system':      'ਸਿਸਟਮ',
      'settings.save':        'ਸੰਭਾਲੋ',
    },
  },
} as const

// ── Init ──────────────────────────────────────────────────────────────────────
export async function initI18n() {
  const saved  = await AsyncStorage.getItem(LANG_KEY).catch(() => null)
  const device = Localization.getLocales()[0]?.languageCode ?? 'en'
  const lng    = saved ?? device

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng:  'en',
      interpolation: { escapeValue: false },
    })
}

export async function changeLanguage(lang: string) {
  await i18n.changeLanguage(lang)
  await AsyncStorage.setItem(LANG_KEY, lang).catch(() => {})
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी',    flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ',  flag: '🟠' },
]

export default i18n