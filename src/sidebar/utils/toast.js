/**
 * Simple toast notification system
 * Matches the style used in delivery rules validation
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {object} options - Options
 * @param {'error'|'success'|'warning'|'info'} options.type - Type of toast (default: 'error')
 * @param {number} options.duration - Duration in ms (default: 4000)
 */
export function showToast(message, options = {}) {
  const { type = "error", duration = 4000 } = options;

  const toast = document.createElement("div");
  toast.className =
    "fixed top-4 left-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in";

  // Type-specific styles
  const typeStyles = {
    error: "bg-red-500 text-white",
    success: "bg-green-500 text-white",
    warning: "bg-yellow-500 text-black",
    info: "bg-blue-500 text-white",
  };

  toast.className += ` ${typeStyles[type] || typeStyles.error}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}
