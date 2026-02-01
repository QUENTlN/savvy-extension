import { browser } from "../../../shared/browser.js";
import { Store } from "../../state.js";
import { CURRENCIES } from "../../../shared/config/currencies.js";
import { setLanguage, getCurrentLanguage } from "../../../shared/i18n.js";

export function navigateBack() {
  Store.setState({ currentView: "sessions" });
}

export async function getSettings() {
  return browser.storage.local.get([
    "darkMode",
    "language",
    "currency",
    "defaultWeightUnit",
    "defaultVolumeUnit",
    "defaultDimensionUnit",
    "defaultDistanceUnit",
  ]);
}

export async function saveSettings(settingsData) {
  const {
    darkMode,
    language,
    currency,
    defaultWeightUnit,
    defaultVolumeUnit,
    defaultDimensionUnit,
    defaultDistanceUnit,
  } = settingsData;

  await browser.storage.local.set({
    darkMode,
    language,
    currency,
    defaultWeightUnit,
    defaultVolumeUnit,
    defaultDimensionUnit,
    defaultDistanceUnit,
  });

  // Update currency in Store
  const c = CURRENCIES.find((curr) => curr.code === currency);
  if (c) Store.setState({ currency: c.symbol }, true);

  // Apply dark mode
  if (darkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Apply language change if needed
  if (language !== getCurrentLanguage()) {
    await setLanguage(language);
  }

  // Navigate back to sessions
  Store.setState({ currentView: "sessions" });
}
