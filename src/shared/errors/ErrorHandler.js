import { AppError } from "./AppError.js";
import { APIError } from "./APIError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Centralized error handling service
 * Normalizes errors, logs them, and optionally displays user notifications
 */
export class ErrorHandler {
  /**
   * Handle an error with optional user notification
   * @param {Error} error - The error to handle
   * @param {object} options - Handling options
   * @param {boolean} [options.silent=false] - If true, don't show user notification
   * @param {string} [options.fallbackMessage] - Message to show if error has none
   * @param {Function} [options.showToast] - Toast function (for sidebar context)
   * @param {Function} [options.t] - Translation function
   * @returns {AppError} - Normalized AppError instance
   */
  static handle(error, options = {}) {
    const { silent = false, fallbackMessage = "An unexpected error occurred", showToast, t } = options;

    // Normalize to AppError
    const appError = ErrorHandler.normalize(error);

    // Log to console with full context
    ErrorHandler.log(appError);

    // Show user notification unless silent
    if (!silent && showToast) {
      const message = ErrorHandler.getUserMessage(appError, { t, fallbackMessage });
      const type = ErrorHandler.getToastType(appError);
      showToast(message, { type });
    }

    return appError;
  }

  /**
   * Normalize any error to an AppError
   * @param {Error} error - Any error
   * @returns {AppError}
   */
  static normalize(error) {
    // Already an AppError
    if (AppError.isAppError(error)) {
      return error;
    }

    // Convert generic Error to AppError
    return new AppError(error.message || "Unknown error", {
      code: "UNKNOWN",
      cause: error,
      context: {
        originalName: error.name,
        originalStack: error.stack,
      },
    });
  }

  /**
   * Log error with structured information
   * @param {AppError} error
   */
  static log(error) {
    const logData = error.toJSON();

    // Use appropriate console method based on severity
    if (error.code === ERROR_CODES.API_RATE_LIMITED) {
      console.warn(`[${error.code}] ${error.message}`, logData);
    } else if (error.code?.startsWith("API_") || error.code?.startsWith("STR_")) {
      console.error(`[${error.code}] ${error.message}`, logData);
    } else {
      console.error(`[${error.code || "UNKNOWN"}] ${error.message}`, logData);
    }
  }

  /**
   * Get user-friendly message for display
   * @param {AppError} error
   * @param {object} options
   * @param {Function} [options.t] - Translation function
   * @param {string} [options.fallbackMessage]
   * @returns {string}
   */
  static getUserMessage(error, { t, fallbackMessage = "An error occurred" } = {}) {
    // Try to get translated message
    if (t && error.i18nKey) {
      const translated = t(error.i18nKey);
      if (translated && translated !== error.i18nKey) {
        return ErrorHandler.interpolateMessage(translated, error);
      }
    }

    // Fall back to error message
    return error.message || fallbackMessage;
  }

  /**
   * Interpolate context values into message template
   * @param {string} template - Message with {placeholders}
   * @param {AppError} error
   * @returns {string}
   */
  static interpolateMessage(template, error) {
    let result = template;
    const context = error.context || {};

    // Replace {key} placeholders with context values
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
    }

    // Also check direct error properties
    if (error.currency) {
      result = result.replace(/\{currency\}/g, error.currency);
    }

    return result;
  }

  /**
   * Determine toast type based on error
   * @param {AppError} error
   * @returns {'error'|'warning'|'info'}
   */
  static getToastType(error) {
    // Rate limiting is a warning, not an error
    if (error instanceof APIError && error.rateLimited) {
      return "warning";
    }

    // Validation errors are warnings
    if (error.code?.startsWith("VAL_")) {
      return "warning";
    }

    return "error";
  }

  /**
   * Check if error is a rate limit error
   * @param {Error} error
   * @returns {boolean}
   */
  static isRateLimited(error) {
    return error instanceof APIError && error.rateLimited;
  }

  /**
   * Check if error is recoverable (user can retry)
   * @param {Error} error
   * @returns {boolean}
   */
  static isRecoverable(error) {
    if (!(error instanceof AppError)) return false;

    // Network errors and server errors are usually recoverable
    const recoverableCodes = [
      ERROR_CODES.API_NETWORK_ERROR,
      ERROR_CODES.API_SERVER_ERROR,
      ERROR_CODES.API_TIMEOUT,
    ];

    return recoverableCodes.includes(error.code);
  }
}
