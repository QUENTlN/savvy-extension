document.addEventListener("DOMContentLoaded", () => {
  // Open sidebar
  document.getElementById("open-sidebar").addEventListener("click", () => {
    browser.sidebarAction.open()
  })
})
