import { browser } from "../shared/browser.js";

document.addEventListener("DOMContentLoaded", () => {
  // Open sidebar/side panel
  document.getElementById("open-sidebar").addEventListener("click", async () => {
    // Detect browser and use appropriate API
    if (typeof browser !== "undefined" && browser.sidebarAction) {
      // Firefox - use sidebarAction
      browser.sidebarAction.open();
    } else if (typeof chrome !== "undefined" && chrome.sidePanel) {
      // Chrome MV3 - use sidePanel
      try {
        const window = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: window.id });
      } catch (error) {
        console.error("Error opening side panel:", error);
      }
    } else {
      console.error("Sidebar/side panel API not available");
    }
  });
});
