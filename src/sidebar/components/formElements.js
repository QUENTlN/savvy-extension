// Form element components for the sidebar UI

export function renderRadioOption(config) {
  const { name, value, checked, label, helpText, helpIcon = true, additionalClasses = "" } = config;
  const radioId = `${name}_${value}`;

  return `
    <div class="relative ${additionalClasses}">
      <label for="${radioId}" class="flex items-center p-4 border border-default rounded-xl cursor-pointer hover:bg-[hsl(var(--muted))] transition-all bg-[hsl(var(--card))] has-[:checked]:border-[hsl(var(--primary))] has-[:checked]:bg-[hsl(var(--muted))]/50 has-[:checked]:ring-1 has-[:checked]:ring-[hsl(var(--primary))]/20">
        <input type="radio" id="${radioId}" name="${name}" value="${value}" class="sr-only peer" ${checked ? "checked" : ""}>
        <div class="w-5 h-5 rounded-full border border-default flex items-center justify-center mr-3 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all">
          <div class="w-2 h-2 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
        </div>
        <span class="card-text font-medium text-sm transition-colors peer-checked:text-primary flex-1 truncate">${label}</span>
        ${helpIcon && helpText ? `<div class="icon icon-help w-4 h-4 secondary-text opacity-40 hover:opacity-100 transition-opacity cursor-help" title="${helpText}"></div>` : ""}
      </label>
    </div>
  `;
}

export function renderToggleSwitch(config) {
  const {
    id,
    label,
    checked,
    containerClass = "",
    additionalClasses = "",
    additionalAttrs = "",
  } = config;

  return `
    <div class="${containerClass}">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium card-text">${label}</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="${id}" class="sr-only peer ${additionalClasses}" ${checked ? "checked" : ""} ${additionalAttrs}>
          <div class="toggle-switch"></div>
        </label>
      </div>
    </div>
  `;
}

export function renderConditionalThresholdInput(config) {
  const {
    containerClass,
    inputClass,
    label,
    value,
    visible,
    placeholder = "0.00",
    additionalAttrs = "",
  } = config;

  return `
    <div class="${containerClass}" style="display: ${visible ? "block" : "none"}">
      <label class="block text-xs secondary-text mb-1 ml-1">${label}</label>
      <input type="number" class="w-full px-3 py-2 border border-default input-bg card-text rounded-md ${inputClass} focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value="${value || ""}" placeholder="${placeholder}" step="0.01" ${additionalAttrs}>
    </div>
  `;
}

export function renderActionButton(config) {
  const { id, label, icon, primary = true, fullWidth = false, additionalClass = "" } = config;
  const bgClass = primary ? "primary-bg primary-text" : "secondary-bg secondary-text";
  const widthClass = fullWidth ? "w-full" : "";

  return `
    <button id="${id}" class="${widthClass} flex items-center justify-center space-x-2 cursor-pointer ${bgClass} px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm border border-default ${additionalClass}">
      ${icon ? `<span class="icon icon-${icon} h-5 w-5"></span>` : ""}
      <span class="text-base font-medium">${label}</span>
    </button>
  `;
}
