import { AppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Error class for internationalization related errors
 */
export class I18nError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {string} [options.key] - Missing translation key
   * @param {string} [options.locale] - Locale code
   * @param {object} [options.context] - Additional context
   * @param {Error} [options.cause] - Original error
   */
  constructor(message, { code, key, locale, context = {}, cause } = {}) {
    super(message, {
      code,
      i18nKey: `errors.${code}`,
      context: { ...context, key, locale },
      cause,
    });
    this.key = key;
    this.locale = locale;
  }

  /**
   * Creates an I18nError for missing translation key
   * @param {string} key - Translation key
   * @param {string} locale - Current locale
   * @returns {I18nError}
   */
  static missingKey(key, locale) {
    return new I18nError(`Missing translation: ${key}`, {
      code: ERROR_CODES.I18N_MISSING_KEY,
      key,
      locale,
    });
  }

  /**
   * Creates an I18nError for invalid locale
   * @param {string} locale - Invalid locale code
   * @returns {I18nError}
   */
  static invalidLocale(locale) {
    return new I18nError(`Invalid locale: ${locale}`, {
      code: ERROR_CODES.I18N_INVALID_LOCALE,
      locale,
    });
  }
}
