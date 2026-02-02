import { AppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Error class for currency conversion related errors
 */
export class ConversionError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {string} [options.currency] - Currency code involved
   * @param {*} [options.amount] - Amount that failed conversion
   * @param {object} [options.context] - Additional context
   * @param {Error} [options.cause] - Original error
   */
  constructor(message, { code, currency, amount, context = {}, cause } = {}) {
    super(message, {
      code,
      i18nKey: `errors.${code}`,
      context: { ...context, currency, amount },
      cause,
    });
    this.currency = currency;
    this.amount = amount;
  }

  /**
   * Creates a ConversionError for missing exchange rate
   * @param {string} currency - Currency code without rate
   * @returns {ConversionError}
   */
  static missingRate(currency) {
    return new ConversionError(`No conversion rate provided for ${currency}`, {
      code: ERROR_CODES.CONVERSION_MISSING_RATE,
      currency,
    });
  }

  /**
   * Creates a ConversionError for invalid amount
   * @param {*} amount - The invalid amount
   * @param {string} [currency] - Currency code
   * @returns {ConversionError}
   */
  static invalidAmount(amount, currency) {
    return new ConversionError(`Invalid amount for conversion: ${amount}`, {
      code: ERROR_CODES.CONVERSION_INVALID_AMOUNT,
      amount,
      currency,
    });
  }
}
