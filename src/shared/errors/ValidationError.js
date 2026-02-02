import { AppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Error class for validation errors (forms, data format, JSON parsing)
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {string} [options.field] - Field name that failed validation
   * @param {*} [options.value] - The invalid value
   * @param {object} [options.context] - Additional context
   * @param {Error} [options.cause] - Original error
   */
  constructor(message, { code, field, value, context = {}, cause } = {}) {
    super(message, {
      code,
      i18nKey: `errors.${code}`,
      context: { ...context, field, value },
      cause,
    });
    this.field = field;
    this.value = value;
  }

  /**
   * Creates a ValidationError for a required field
   * @param {string} field - Field name
   * @returns {ValidationError}
   */
  static required(field) {
    return new ValidationError(`${field} is required`, {
      code: ERROR_CODES.VALIDATION_REQUIRED,
      field,
    });
  }

  /**
   * Creates a ValidationError for an invalid number
   * @param {string} field - Field name
   * @param {*} value - The invalid value
   * @returns {ValidationError}
   */
  static invalidNumber(field, value) {
    return new ValidationError(`${field} must be a valid number`, {
      code: ERROR_CODES.VALIDATION_INVALID_NUMBER,
      field,
      value,
    });
  }

  /**
   * Creates a ValidationError for invalid JSON
   * @param {Error} cause - JSON parse error
   * @returns {ValidationError}
   */
  static invalidJSON(cause) {
    return new ValidationError("Invalid JSON format", {
      code: ERROR_CODES.VALIDATION_INVALID_JSON,
      cause,
    });
  }

  /**
   * Creates a ValidationError for invalid data format
   * @param {string} message - Description of the format error
   * @param {object} [context] - Additional context
   * @returns {ValidationError}
   */
  static invalidFormat(message, context = {}) {
    return new ValidationError(message, {
      code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
      context,
    });
  }
}
