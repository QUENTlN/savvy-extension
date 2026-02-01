// Cross-browser `browser` API shim for WebExtensions
// Ensures `browser` is available in service worker context (Chrome MV3)

(function () {
  // Use self in service worker context, fallback to globalThis
  const globalScope =
    typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : global;

  // If `browser` already exists (e.g. Firefox), do nothing
  if (typeof globalScope.browser !== "undefined") {
    return;
  }

  // Fallback to `chrome` (Chrome, Edge, Brave, etc.)
  if (typeof globalScope.chrome !== "undefined") {
    try {
      // In MV3 service worker, we need to wrap chrome APIs to return Promises
      globalScope.browser = {
        ...globalScope.chrome,
        storage: {
          local: {
            get: (keys) => {
              return new Promise((resolve) => {
                globalScope.chrome.storage.local.get(keys, resolve);
              });
            },
            set: (items) => {
              return new Promise((resolve) => {
                globalScope.chrome.storage.local.set(items, resolve);
              });
            },
          },
        },
        tabs: {
          ...globalScope.chrome.tabs,
          get: (tabId) => {
            return new Promise((resolve, reject) => {
              globalScope.chrome.tabs.get(tabId, (tab) => {
                if (globalScope.chrome.runtime.lastError) {
                  reject(new Error(globalScope.chrome.runtime.lastError.message));
                } else {
                  resolve(tab);
                }
              });
            });
          },
          sendMessage: (tabId, message) => {
            return new Promise((resolve, reject) => {
              globalScope.chrome.tabs.sendMessage(tabId, message, (response) => {
                if (globalScope.chrome.runtime.lastError) {
                  reject(new Error(globalScope.chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              });
            });
          },
          create: (createProperties) => {
            return new Promise((resolve) => {
              globalScope.chrome.tabs.create(createProperties, resolve);
            });
          },
        },
        windows: {
          ...globalScope.chrome.windows,
          getCurrent: () => {
            return new Promise((resolve) => {
              globalScope.chrome.windows.getCurrent(resolve);
            });
          },
          getLastFocused: () => {
            return new Promise((resolve) => {
              globalScope.chrome.windows.getLastFocused(resolve);
            });
          },
        },
        runtime: {
          ...globalScope.chrome.runtime,
          sendMessage: (message) => {
            return new Promise((resolve, reject) => {
              globalScope.chrome.runtime.sendMessage(message, (response) => {
                if (globalScope.chrome.runtime.lastError) {
                  reject(new Error(globalScope.chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              });
            });
          },
        },
      };
      return;
    } catch (e) {
      // If for some reason wrapping fails, we silently ignore
    }
  }

  // As a final fallback, define a minimal no-op object to avoid hard crashes
  if (typeof globalScope.browser === "undefined") {
    globalScope.browser = {
      runtime: {
        sendMessage: function () {
          console.warn(
            "browser.runtime.sendMessage called but WebExtension APIs are not available."
          );
        },
        onMessage: {
          addListener: function () {
            console.warn(
              "browser.runtime.onMessage.addListener called but WebExtension APIs are not available."
            );
          },
        },
      },
    };
  }
})();
