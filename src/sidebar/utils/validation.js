// Tier validation utilities for the sidebar
import { t } from "../../shared/i18n.js";
import {
  getTierType,
  requiresInteger,
  getMinValueForFirstTier,
  parseTierRange,
  getAllTierRanges,
} from "./tierHelpers.js";

/**
 * Show validation error on an input field
 * @param {HTMLElement} input - The input element
 * @param {string} message - Error message
 * @param {string} severity - 'warning' (orange) or 'error' (red)
 */
export function showTierInputError(input, message, severity = "warning") {
  if (!input) return;

  clearTierInputError(input);

  if (severity === "error") {
    input.classList.add("!border-red-500", "focus:!ring-red-500");
    input.dataset.errorSeverity = "error";
  } else {
    input.classList.add("!border-orange-500", "focus:!ring-orange-500");
    input.dataset.errorSeverity = "warning";
  }

  const row = input.closest(".range-row");
  if (row) {
    let errorDiv = row.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains("tier-error-message")) {
      errorDiv = document.createElement("div");
      errorDiv.className = "tier-error-message text-xs mt-1 px-2 mb-2";
      row.parentNode.insertBefore(errorDiv, row.nextSibling);
    }

    if (severity === "error") {
      errorDiv.className = "tier-error-message text-xs text-red-500 mt-1 px-2 mb-2";
    } else {
      errorDiv.className = "tier-error-message text-xs text-orange-500 mt-1 px-2 mb-2";
    }

    errorDiv.textContent = message;
  }
}

export function clearTierInputError(input) {
  if (!input) return;

  input.classList.remove(
    "!border-red-500",
    "focus:!ring-red-500",
    "!border-orange-500",
    "focus:!ring-orange-500"
  );
  delete input.dataset.errorSeverity;

  const row = input.closest(".range-row");
  if (row) {
    const errorDiv = row.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains("tier-error-message")) {
      errorDiv.remove();
    }
  }
}

export function clearAllTierErrors(container) {
  const inputs = container.querySelectorAll("input[data-error-severity]");
  inputs.forEach((input) => clearTierInputError(input));

  const errorDivs = container.querySelectorAll(".tier-error-message");
  errorDivs.forEach((div) => div.remove());

  const rangesContainer = container.querySelector(".ranges-container");
  if (rangesContainer) {
    const containerError = rangesContainer.querySelector(".tier-container-error");
    if (containerError) containerError.remove();
  }
}

/**
 * Validate that min is >= 0 (or >= 1 for first quantity tier)
 */
export function validateMinValue(range, type, isFirstTier, severity = "warning") {
  const minRequired = isFirstTier ? getMinValueForFirstTier(type) : 0;

  if (range.min < minRequired) {
    const message =
      isFirstTier && requiresInteger(type)
        ? t("validation.tier.minMustBeOne")
        : t("validation.tier.minMustBeZeroOrMore");
    showTierInputError(range.minInput, message, severity);
    return false;
  }

  return true;
}

/**
 * Validate that max > min (when max is not empty)
 */
export function validateMaxGreaterThanMin(range, type, severity = "warning") {
  if (range.max !== null && range.max <= range.min) {
    showTierInputError(range.maxInput, t("validation.tier.maxMustBeGreaterThanMin"), severity);
    return false;
  }

  return true;
}

/**
 * Validate that field values are valid numbers
 */
export function validateNumericFields(range, type, severity = "warning", isLastTier = false) {
  let valid = true;

  if (range.minInput) {
    const minValue = range.minInput.value.trim();
    if (minValue === "" || isNaN(parseFloat(minValue))) {
      showTierInputError(range.minInput, t("validation.tier.mustBeNumber"), severity);
      valid = false;
    }
  }

  if (range.maxInput) {
    const maxValue = range.maxInput.value.trim();

    if (maxValue === "") {
      if (!isLastTier) {
        showTierInputError(range.maxInput, t("validation.tier.mustBeNumber"), severity);
        valid = false;
      }
    } else if (isNaN(parseFloat(maxValue))) {
      showTierInputError(range.maxInput, t("validation.tier.mustBeNumber"), severity);
      valid = false;
    }
  }

  if (range.valueInput) {
    const valueStr = range.valueInput.value.trim();
    if (severity === "error") {
      if (valueStr === "" || isNaN(parseFloat(valueStr))) {
        showTierInputError(range.valueInput, t("validation.tier.mustBeNumber"), severity);
        valid = false;
      }
    } else {
      if (valueStr !== "" && isNaN(parseFloat(valueStr))) {
        showTierInputError(range.valueInput, t("validation.tier.mustBeNumber"), severity);
        valid = false;
      }
    }
  }

  return valid;
}

/**
 * Validate integer constraint for quantity types
 */
export function validateIntegerConstraint(range, type, severity = "warning") {
  if (!requiresInteger(type)) return true;

  let valid = true;

  if (!isNaN(range.min) && range.min !== Math.floor(range.min)) {
    showTierInputError(range.minInput, t("validation.tier.mustBeInteger"), severity);
    valid = false;
  }

  if (range.max !== null && !isNaN(range.max) && range.max !== Math.floor(range.max)) {
    showTierInputError(range.maxInput, t("validation.tier.mustBeInteger"), severity);
    valid = false;
  }

  return valid;
}

/**
 * Validate value is filled and >= 0
 */
export function validateValueField(range, severity = "warning") {
  if (!range.valueInput) return true;

  const valueStr = range.valueInput.value.trim();

  if (severity === "error" && valueStr === "") {
    showTierInputError(range.valueInput, t("validation.tier.valueRequired"), severity);
    return false;
  }

  if (range.value < 0) {
    showTierInputError(range.valueInput, t("validation.tier.valueMustBePositive"), severity);
    return false;
  }

  return true;
}

/**
 * Validate continuity between consecutive tiers
 */
export function validateContinuity(currentRange, previousRange, type, severity = "warning") {
  if (!previousRange) return true;

  if (previousRange.max === null) {
    return true;
  }

  const expectedMin = requiresInteger(type) ? previousRange.max + 1 : previousRange.max;

  if (currentRange.min !== expectedMin) {
    const message = t("validation.tier.gapBetweenTiers");
    showTierInputError(currentRange.minInput, message, severity);
    return false;
  }

  return true;
}

/**
 * Validate no overlaps between tiers
 */
export function validateNoOverlap(currentRange, previousRange, type, severity = "warning") {
  if (!previousRange || previousRange.max === null) return true;

  const minRequired = requiresInteger(type) ? previousRange.max + 1 : previousRange.max;

  if (currentRange.min < minRequired) {
    showTierInputError(currentRange.minInput, t("validation.tier.overlapDetected"), severity);
    return false;
  }

  return true;
}

/**
 * Validate that last tier has empty max (infinity)
 */
export function validateLastTierInfinity(ranges, severity = "error") {
  if (ranges.length === 0) return true;

  const lastRange = ranges[ranges.length - 1];
  if (lastRange.max !== null) {
    showTierInputError(lastRange.maxInput, t("validation.tier.lastTierMustBeInfinity"), severity);
    return false;
  }

  return true;
}

/**
 * Validate at least one tier exists
 */
export function validateAtLeastOneTier(ranges, container, _severity = "error") {
  if (ranges.length === 0) {
    const rangesContainer = container.querySelector(".ranges-container");
    if (rangesContainer) {
      let errorDiv = rangesContainer.querySelector(".tier-container-error");
      if (!errorDiv) {
        errorDiv = document.createElement("div");
        errorDiv.className = "tier-container-error text-xs text-red-500 mt-1 px-2 mb-2";
        rangesContainer.insertBefore(errorDiv, rangesContainer.firstChild);
      }
      errorDiv.textContent = t("validation.tier.atLeastOneTierRequired");
    }
    return false;
  }

  const rangesContainer = container.querySelector(".ranges-container");
  if (rangesContainer) {
    const errorDiv = rangesContainer.querySelector(".tier-container-error");
    if (errorDiv) errorDiv.remove();
  }

  return true;
}

/**
 * Validate no duplicate ranges
 */
export function validateNoDuplicates(ranges, severity = "error") {
  const seen = new Set();
  let valid = true;

  ranges.forEach((range) => {
    const key = `${range.min}-${range.max}`;
    if (seen.has(key)) {
      showTierInputError(range.minInput, t("validation.tier.duplicateRange"), severity);
      showTierInputError(range.maxInput, t("validation.tier.duplicateRange"), severity);
      valid = false;
    }
    seen.add(key);
  });

  return valid;
}

/**
 * Perform live validation on a single input field
 */
export function performLiveValidation(input, container) {
  const type = getTierType(container);
  const ranges = getAllTierRanges(container, type);
  const row = input.closest(".range-row");

  if (!row) return;

  const currentRange = parseTierRange(row, type);
  const currentIndex = ranges.findIndex((r) => r.row === row);
  const isFirstTier = currentIndex === 0;
  const isLastTier = currentIndex === ranges.length - 1;
  const previousRange = currentIndex > 0 ? ranges[currentIndex - 1] : null;

  clearTierInputError(input);

  const fieldName = input.name.split("_").pop();

  if (fieldName === "min") {
    if (!validateNumericFields(currentRange, type, "warning", isLastTier)) return;

    validateMinValue(currentRange, type, isFirstTier, "warning");
    validateIntegerConstraint(currentRange, type, "warning");
    validateContinuity(currentRange, previousRange, type, "warning");
    validateNoOverlap(currentRange, previousRange, type, "warning");
  } else if (fieldName === "max") {
    if (!validateNumericFields(currentRange, type, "warning", isLastTier)) return;

    validateMaxGreaterThanMin(currentRange, type, "warning");
    validateIntegerConstraint(currentRange, type, "warning");

    if (currentIndex < ranges.length - 1) {
      const nextRange = ranges[currentIndex + 1];
      const nextMinInput = nextRange.minInput;
      clearTierInputError(nextMinInput);
      const updatedNextRange = parseTierRange(nextRange.row, type);
      validateContinuity(updatedNextRange, currentRange, type, "warning");
    }
  } else if (fieldName === "value") {
    validateNumericFields(currentRange, type, "warning", isLastTier);
    if (currentRange.value < 0) {
      validateValueField(currentRange, "warning");
    }
  }
}

/**
 * Perform complete validation before submission
 * Returns true if all validations pass, false otherwise
 */
export function performSubmissionValidation(container) {
  const type = getTierType(container);
  const ranges = getAllTierRanges(container, type);

  clearAllTierErrors(container);

  let valid = true;

  if (!validateAtLeastOneTier(ranges, container, "error")) {
    valid = false;
  }

  if (ranges.length === 0) {
    return false;
  }

  if (!validateLastTierInfinity(ranges, "error")) {
    valid = false;
  }

  if (!validateNoDuplicates(ranges, "error")) {
    valid = false;
  }

  ranges.forEach((range, index) => {
    const isFirstTier = index === 0;
    const isLastTier = index === ranges.length - 1;
    const previousRange = index > 0 ? ranges[index - 1] : null;

    if (!validateNumericFields(range, type, "error", isLastTier)) {
      valid = false;
      return;
    }

    if (!validateMinValue(range, type, isFirstTier, "error")) {
      valid = false;
    }

    if (!validateMaxGreaterThanMin(range, type, "error")) {
      valid = false;
    }

    if (!validateIntegerConstraint(range, type, "error")) {
      valid = false;
    }

    if (!validateContinuity(range, previousRange, type, "error")) {
      valid = false;
    }

    if (!validateNoOverlap(range, previousRange, type, "error")) {
      valid = false;
    }

    if (!validateValueField(range, "error")) {
      valid = false;
    }
  });

  return valid;
}

/**
 * Validate that an input contains a valid numeric value
 */
export function validateNumericInput(input, errorKey = "validation.tier.mustBeNumber") {
  if (!input) return true;

  const value = parseFloat(input.value);
  const isValid = !isNaN(value) && input.value.trim() !== "";

  if (!isValid) {
    input.classList.add("!border-red-500", "focus:!ring-red-500");
    let errorDiv = input.parentElement.querySelector(".field-error-message");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.className = "field-error-message text-xs text-red-500 mt-1";
      input.parentElement.appendChild(errorDiv);
    }
    errorDiv.textContent = t(errorKey);
  } else {
    input.classList.remove("!border-red-500", "focus:!ring-red-500");
    const errorDiv = input.parentElement.querySelector(".field-error-message");
    if (errorDiv) errorDiv.remove();
  }

  return isValid;
}

/**
 * Validate numeric fields for non-tiered calculation types (Fixed, Percentage)
 */
export function validateNonTieredFields(container) {
  const prefix = container.dataset.prefix;
  const type = getTierType(container);

  if (type === "fixed") {
    return validateNumericInput(container.querySelector(`input[name="${prefix}_amount"]`));
  } else if (type === "percentage") {
    return validateNumericInput(container.querySelector(`input[name="${prefix}_rate"]`));
  }

  return true;
}

/**
 * Validate all tier-based forms in the current view
 */
export function validateAllTierForms() {
  let allValid = true;

  const containers = document.querySelectorAll(".calculation-rules-container");

  containers.forEach((container) => {
    const prefix = container.dataset.prefix;
    const type = getTierType(container);
    const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`);

    if (!isTieredCb || !isTieredCb.checked) {
      if (!validateNonTieredFields(container)) {
        allValid = false;
      }
    } else {
      if (["quantity", "distance", "weight", "volume"].includes(type)) {
        if (!performSubmissionValidation(container)) {
          allValid = false;
        }
      }
    }
  });

  return allValid;
}
