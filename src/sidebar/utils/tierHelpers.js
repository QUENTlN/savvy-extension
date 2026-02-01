// Tier helpers for parsing and analyzing tier-based pricing structures

export function getTierType(container) {
  const prefix = container.dataset.prefix;
  const typeRadio = container.querySelector(`input[name="${prefix}_type"]:checked`);
  return typeRadio ? typeRadio.value : "quantity";
}

export function requiresInteger(type) {
  return type === "quantity";
}

export function getMinValueForFirstTier(type) {
  return requiresInteger(type) ? 1 : 0;
}

export function parseTierRange(row, type) {
  const minInput = row.querySelector('input[name$="_min"]');
  const maxInput = row.querySelector('input[name$="_max"]');
  const valueInput = row.querySelector('input[name$="_value"]');

  let maxValue = null;
  if (maxInput && maxInput.value !== "") {
    const parsed = parseFloat(maxInput.value);
    maxValue = !isNaN(parsed) ? parsed : null;
  }

  return {
    row: row,
    index: parseInt(row.dataset.index),
    min: minInput ? parseFloat(minInput.value) || 0 : 0,
    max: maxValue,
    value: valueInput ? parseFloat(valueInput.value) || 0 : 0,
    minInput: minInput,
    maxInput: maxInput,
    valueInput: valueInput,
  };
}

export function getAllTierRanges(container, type) {
  const rangesContainer = container.querySelector(".ranges-container");
  if (!rangesContainer) return [];

  const rows = Array.from(rangesContainer.querySelectorAll(".range-row"));
  return rows.map((row) => parseTierRange(row, type));
}
