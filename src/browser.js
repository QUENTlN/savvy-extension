// Cross-browser `browser` API shim for WebExtensions
// Ensures `browser` is available in background, popup, sidebar, and other extension contexts.

;(function () {
  // If `browser` already exists (e.g. Firefox), do nothing
  if (typeof globalThis !== 'undefined' && typeof globalThis.browser !== 'undefined') {
    return
  }

  // Fallback to `chrome` (Chrome, Edge, Brave, etc.)
  if (typeof globalThis !== 'undefined' && typeof globalThis.chrome !== 'undefined') {
    try {
      // In MV2 we can safely alias directly; we don't need Promise-wrapped methods here
      globalThis.browser = globalThis.chrome
      return
    } catch (e) {
      // If for some reason direct aliasing fails, we silently ignore
    }
  }

  // As a final fallback, define a minimal no-op object to avoid hard crashes
  if (typeof globalThis !== 'undefined' && typeof globalThis.browser === 'undefined') {
    globalThis.browser = {
      runtime: {
        sendMessage: function () {
          console.warn('browser.runtime.sendMessage called but WebExtension APIs are not available.')
        },
        onMessage: {
          addListener: function () {
            console.warn('browser.runtime.onMessage.addListener called but WebExtension APIs are not available.')
          },
        },
      },
    }
  }
})()


