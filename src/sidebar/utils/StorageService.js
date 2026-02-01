import { browser } from "../../shared/browser.js";
import {
  DEFAULT_WEIGHT_UNIT,
  DEFAULT_VOLUME_UNIT,
  DEFAULT_DIMENSION_UNIT,
  DEFAULT_DISTANCE_UNIT,
} from "../../shared/config/units.js";
import { DEFAULT_CURRENCY } from "../../shared/config/currencies.js";

let cachedDefaults = null;
let cachedSettings = null;

export const StorageService = {
  async getDefaults() {
    if (cachedDefaults) return cachedDefaults;

    const result = await browser.storage.local.get([
      "defaultWeightUnit",
      "defaultVolumeUnit",
      "defaultDimensionUnit",
      "defaultDistanceUnit",
      "defaultCurrency",
    ]);

    cachedDefaults = {
      weightUnit: result.defaultWeightUnit || DEFAULT_WEIGHT_UNIT,
      volumeUnit: result.defaultVolumeUnit || DEFAULT_VOLUME_UNIT,
      dimensionUnit: result.defaultDimensionUnit || DEFAULT_DIMENSION_UNIT,
      distanceUnit: result.defaultDistanceUnit || DEFAULT_DISTANCE_UNIT,
      currency: result.defaultCurrency || DEFAULT_CURRENCY,
    };

    return cachedDefaults;
  },

  async getUserSettings() {
    if (cachedSettings) return cachedSettings;

    const result = await browser.storage.local.get(["darkMode", "currency"]);

    cachedSettings = {
      darkMode: result.darkMode || false,
      currency: result.currency || DEFAULT_CURRENCY,
    };

    return cachedSettings;
  },

  clearCache() {
    cachedDefaults = null;
    cachedSettings = null;
  },

  async setDefault(key, value) {
    await browser.storage.local.set({ [key]: value });
    cachedDefaults = null;
  },

  async setSetting(key, value) {
    await browser.storage.local.set({ [key]: value });
    cachedSettings = null;
  },
};
