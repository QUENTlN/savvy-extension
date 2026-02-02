import { AppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Error class for web scraping related errors
 * Note: Scraping should be resilient - these are for logging, not throwing
 */
export class ScrapingError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {string} [options.selector] - CSS selector that failed
   * @param {string} [options.url] - Page URL
   * @param {object} [options.context] - Additional context
   * @param {Error} [options.cause] - Original error
   */
  constructor(message, { code, selector, url, context = {}, cause } = {}) {
    super(message, {
      code,
      i18nKey: `errors.${code}`,
      context: { ...context, selector, url },
      cause,
    });
    this.selector = selector;
    this.url = url;
  }

  /**
   * Creates a ScrapingError for selector not found
   * @param {string} selector - CSS selector
   * @param {string} [url] - Page URL
   * @returns {ScrapingError}
   */
  static selectorNotFound(selector, url) {
    return new ScrapingError(`Selector not found: ${selector}`, {
      code: ERROR_CODES.SCRAPING_SELECTOR_NOT_FOUND,
      selector,
      url,
    });
  }

  /**
   * Creates a ScrapingError for parse failures
   * @param {string} message - Description of parse error
   * @param {Error} [cause] - Original error
   * @returns {ScrapingError}
   */
  static parseError(message, cause) {
    return new ScrapingError(message, {
      code: ERROR_CODES.SCRAPING_PARSE_ERROR,
      cause,
    });
  }
}
