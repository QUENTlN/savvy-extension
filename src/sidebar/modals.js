// Generic modal helpers used across the sidebar UI

function setupAutoFocus(modal) {
  // Focus on the first input, select, or textarea that is not disabled
  setTimeout(() => {
    const firstInput = modal.querySelector(
      "input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])",
    )
    if (firstInput) {
      firstInput.focus()
    }
  }, 0)
}

function setupEscapeKey(modal, closeCallback) {
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      closeCallback()
      document.removeEventListener("keydown", handleEscape)
    }
  }
  document.addEventListener("keydown", handleEscape)
}

function setupEnterKey(modal, submitCallback) {
  const handleEnter = (e) => {
    // Don't submit on Enter if we're in a textarea
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault()
      submitCallback()
    }
  }
  modal.addEventListener("keydown", handleEnter)
}

function showFieldError(fieldId, errorMessage) {
  const field = document.getElementById(fieldId)
  if (!field) return

  // Add error styling to field
  field.classList.add("border-red-500", "focus:ring-red-500")
  field.classList.remove("border-gray-300", "focus:ring-gray-500")

  // Remove any existing error message
  const existingError = field.parentElement.querySelector(".field-error-message")
  if (existingError) {
    existingError.remove()
  }

  // Add error message
  const errorDiv = document.createElement("p")
  errorDiv.className = "field-error-message text-sm text-red-600 mt-1"
  errorDiv.textContent = errorMessage
  field.parentElement.appendChild(errorDiv)
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId)
  if (!field) return

  // Remove error styling
  field.classList.remove("border-red-500", "focus:ring-red-500")
  field.classList.add("border-gray-300", "focus:ring-gray-500")

  // Remove error message
  const errorMessage = field.parentElement.querySelector(".field-error-message")
  if (errorMessage) {
    errorMessage.remove()
  }
}

function clearAllErrors(modal) {
  // Remove all error styling and messages
  modal.querySelectorAll(".border-red-500").forEach((field) => {
    field.classList.remove("border-red-500", "focus:ring-red-500")
    field.classList.add("border-gray-300", "focus:ring-gray-500")
  })
  modal.querySelectorAll(".field-error-message").forEach((msg) => msg.remove())
}

function validateRequiredField(fieldId, fieldName) {
  const field = document.getElementById(fieldId)
  if (!field) return true

  const value = field.value.trim()
  if (!value) {
    showFieldError(fieldId, `${fieldName} is required`)
    return false
  }

  clearFieldError(fieldId)
  return true
}


