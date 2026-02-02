/**
 * Base error class for all application errors
 * Provides structured error information for logging and user display
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {string} [options.i18nKey] - i18n key for translated message
   * @param {object} [options.context] - Additional context for debugging
   * @param {Error} [options.cause] - Original error that caused this one
   */
  constructor(message, { code, i18nKey, context = {}, cause } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.i18nKey = i18nKey;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a plain object representation for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      i18nKey: this.i18nKey,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  /**
   * Checks if an error is an instance of AppError or its subclasses
   * @param {Error} error
   * @returns {boolean}
   */
  static isAppError(error) {
    return error instanceof AppError;
  }
}
