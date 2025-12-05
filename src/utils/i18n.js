// i18n system for the browser extension
let currentLanguage = DEFAULT_LANGUAGE;
let translations = {};

/**
 * Initialize the i18n system with a language
 * @param {string} language - Language code (e.g., 'en', 'fr', 'es')
 * @returns {Promise<void>}
 */
async function initI18n(language) {
  if (!language) {
    // Try to get from storage first
    const settings = await browser.storage.local.get(["language"]);
    if (settings.language) {
      language = settings.language;
    } else {
      // Detect browser locale
      const browserLang = navigator.language.split("-")[0]; // e.g., 'en-US' -> 'en'
      const supportedLangs = LANGUAGES.map(l => l.code);
      language = supportedLangs.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE;
    }
  }
  
  await loadTranslations(language);
  currentLanguage = language;
}

/**
 * Load translations for a specific language
 * @param {string} language - Language code
 * @returns {Promise<void>}
 */
async function loadTranslations(language) {
  try {
    // Fetch the translation file
    const url = browser.runtime.getURL(`locales/${language}.json`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${language}`);
    }
    translations = await response.json();
  } catch (error) {
    console.error(`Error loading translations for ${language}:`, error);
    // Fallback to English if available and not already trying English
    if (language !== DEFAULT_LANGUAGE) {
      console.log(`Falling back to ${DEFAULT_LANGUAGE}`);
      await loadTranslations(DEFAULT_LANGUAGE);
      currentLanguage = DEFAULT_LANGUAGE;
    }
  }
}

/**
 * Get translation for a key with optional parameter interpolation
 * @param {string} key - Translation key (e.g., 'common.back')
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} - Translated string
 */
function t(key, params = {}) {
  // Navigate nested object using dot notation
  const keys = key.split(".");
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // Key not found, return the key itself as fallback
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  // If value is not a string, return key
  if (typeof value !== "string") {
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  }
  
  // Interpolate parameters
  let result = value;
  for (const [param, paramValue] of Object.entries(params)) {
    const regex = new RegExp(`{{${param}}}`, "g");
    result = result.replace(regex, paramValue);
  }
  
  return result;
}

/**
 * Get the current language code
 * @returns {string}
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Set a new language and reload translations
 * @param {string} language - Language code
 * @returns {Promise<void>}
 */
async function setLanguage(language) {
  await loadTranslations(language);
  currentLanguage = language;
  // Save to storage
  await browser.storage.local.set({ language });
}
