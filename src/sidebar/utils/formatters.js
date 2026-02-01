import { CURRENCIES } from "../../shared/config/currencies.js";

/**
 * Format a decimal value as percentage without trailing zeros
 * @param {number} decimalValue - Value as decimal (e.g., 0.05 for 5%)
 * @param {number} [decimals=2] - Max decimal places
 * @returns {string} Formatted percentage string (e.g., "5" or "5.1" or "5.12")
 */
export function formatPercent(decimalValue, decimals = 2) {
  if (decimalValue === undefined || decimalValue === null || decimalValue === "") {
    return "";
  }
  const percentValue = decimalValue * 100;
  return parseFloat(percentValue.toFixed(decimals)).toString();
}

/**
 * Format a number without trailing zeros
 * @param {number} value - The number to format
 * @param {number} [decimals=2] - Max decimal places
 * @returns {string} Formatted number string (e.g., "1" for 1.00, "1.1" for 1.10, "1.01" for 1.01)
 */
export function formatNumber(value, decimals = 2) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return parseFloat(value.toFixed(decimals)).toString();
}

/**
 * Get currency symbol from currency code
 * @param {string} currencyCode - ISO currency code (e.g., "EUR", "USD")
 * @returns {string} Currency symbol (e.g., "€", "$") or the code if not found
 */
export function getCurrencySymbol(currencyCode) {
  if (!currencyCode) return "";

  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  return currency ? currency.symbol : currencyCode;
}

/**
 * Format a currency amount with symbol
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO currency code (e.g., "EUR", "USD")
 * @param {number} [decimals=2] - Max decimal places
 * @returns {string} Formatted currency string (e.g., "10.5 €", "100 $")
 */
export function formatCurrency(amount, currencyCode, decimals = 2) {
  if (amount === undefined || amount === null || amount === "") {
    return "";
  }
  const formattedAmount = formatNumber(amount, decimals);
  const symbol = getCurrencySymbol(currencyCode);
  return `${formattedAmount} ${symbol}`;
}
