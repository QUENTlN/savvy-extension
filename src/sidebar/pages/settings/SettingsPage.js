import { renderSettingsView } from "./SettingsView.js";
import * as actions from "./SettingsActions.js";

export async function initSettingsPage(app) {
  const settings = await actions.getSettings();
  app.innerHTML = renderSettingsView({ settings });
  attachEventListeners();
}

function attachEventListeners() {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateBack);

  document.getElementById("save-settings-button")?.addEventListener("click", async () => {
    const settingsData = {
      darkMode: document.getElementById("dark-mode").checked,
      language: document.getElementById("language").value,
      currency: document.getElementById("currency").value,
      defaultWeightUnit: document.getElementById("default-weight-unit").value,
      defaultVolumeUnit: document.getElementById("default-volume-unit").value,
      defaultDimensionUnit: document.getElementById("default-dimension-unit").value,
      defaultDistanceUnit: document.getElementById("default-distance-unit").value,
    };

    await actions.saveSettings(settingsData);
  });
}
