import { AppError } from "./AppError.js";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Error class for API-related errors (HTTP, network, rate limiting)
 */
export class APIError extends AppError {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} options - Error options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {number} [options.status] - HTTP status code
   * @param {string} [options.url] - Request URL
   * @param {boolean} [options.rateLimited] - Whether this is a rate limit error
   * @param {object} [options.context] - Additional context
   * @param {Error} [options.cause] - Original error
   */
  constructor(message, { code, status, url, rateLimited = false, context = {}, cause } = {}) {
    super(message, {
      code,
      i18nKey: `errors.${code}`,
      context: { ...context, status, url },
      cause,
    });
    this.status = status;
    this.url = url;
    this.rateLimited = rateLimited;
  }

  /**
   * Creates an APIError from a fetch Response
   * @param {Response} response - Fetch Response object
   * @param {string} url - Request URL
   * @param {string} [responseText] - Response body text (if already read)
   * @returns {Promise<APIError>}
   */
  static async fromResponse(response, url, responseText = null) {
    const text = responseText ?? (await response.text());
    let detail = text;

    // Try to parse JSON error
    try {
      const data = JSON.parse(text);
      detail = data.detail || data.message || data.error || text;
    } catch {
      // Keep text as-is
    }

    // Rate limiting
    if (response.status === 429) {
      return new APIError(detail || "Rate limited", {
        code: ERROR_CODES.API_RATE_LIMITED,
        status: 429,
        url,
        rateLimited: true,
        context: { responseText: text.substring(0, 200) },
      });
    }

    // Client errors (4xx)
    if (response.status >= 400 && response.status < 500) {
      return new APIError(detail || `Request failed: ${response.status}`, {
        code: ERROR_CODES.API_BAD_REQUEST,
        status: response.status,
        url,
        context: { responseText: text.substring(0, 200) },
      });
    }

    // Server errors (5xx)
    return new APIError(detail || `Server error: ${response.status}`, {
      code: ERROR_CODES.API_SERVER_ERROR,
      status: response.status,
      url,
      context: { responseText: text.substring(0, 200) },
    });
  }

  /**
   * Creates an APIError for network failures
   * @param {Error} error - Original error
   * @param {string} url - Request URL
   * @returns {APIError}
   */
  static networkError(error, url) {
    return new APIError(error.message || "Network error", {
      code: ERROR_CODES.API_NETWORK_ERROR,
      url,
      cause: error,
    });
  }

  /**
   * Creates an APIError for timeout
   * @param {string} url - Request URL
   * @param {number} timeout - Timeout in ms
   * @returns {APIError}
   */
  static timeout(url, timeout) {
    return new APIError(`Request timed out after ${timeout}ms`, {
      code: ERROR_CODES.API_TIMEOUT,
      url,
      context: { timeout },
    });
  }
}
