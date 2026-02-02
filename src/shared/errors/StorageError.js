import { AppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Error class for browser.storage related errors
 */
export class StorageError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {string} [options.operation] - 'read' or 'write'
   * @param {string} [options.key] - Storage key involved
   * @param {object} [options.context] - Additional context
   * @param {Error} [options.cause] - Original error
   */
  constructor(message, { code, operation, key, context = {}, cause } = {}) {
    super(message, {
      code,
      i18nKey: `errors.${code}`,
      context: { ...context, operation, key },
      cause,
    });
    this.operation = operation;
    this.key = key;
  }

  /**
   * Creates a StorageError for read failures
   * @param {string} key - Storage key
   * @param {Error} cause - Original error
   * @returns {StorageError}
   */
  static readError(key, cause) {
    return new StorageError(`Failed to read from storage: ${key}`, {
      code: ERROR_CODES.STORAGE_READ_ERROR,
      operation: "read",
      key,
      cause,
    });
  }

  /**
   * Creates a StorageError for write failures
   * @param {string} key - Storage key
   * @param {Error} cause - Original error
   * @returns {StorageError}
   */
  static writeError(key, cause) {
    return new StorageError(`Failed to write to storage: ${key}`, {
      code: ERROR_CODES.STORAGE_WRITE_ERROR,
      operation: "write",
      key,
      cause,
    });
  }

  /**
   * Creates a StorageError for quota exceeded
   * @param {Error} cause - Original error
   * @returns {StorageError}
   */
  static quotaExceeded(cause) {
    return new StorageError("Storage quota exceeded", {
      code: ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
      cause,
    });
  }
}
