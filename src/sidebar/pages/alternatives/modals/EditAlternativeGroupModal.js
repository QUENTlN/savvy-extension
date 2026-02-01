import { t } from "../../../../shared/i18n.js";
import * as actions from "../AlternativesActions.js";
import {
  setupAutoFocus,
  setupEscapeKey,
  setupEnterKey,
  clearAllErrors,
  validateRequiredField,
} from "../../../modals.js";

export function showEditAlternativeGroupModal(group) {
  const session = actions.getSession();
  const products = session.products;

  const modal = document.createElement("div");
  modal.innerHTML = `
    <div id="modalOverlay" class="fixed w-full h-full inset-0 bg-black/50 flex justify-center items-center z-50">
      <div id="modalContent" class="card-bg rounded-lg shadow-lg w-full max-w-2xl mx-4 p-6 flex flex-col max-h-[90vh]">
        <h3 class="text-lg font-medium card-text mb-4">${t("alternatives.editGroup")}</h3>

        <div class="mb-4">
          <label class="block text-sm font-medium secondary-text mb-1">${t("alternatives.groupName")}</label>
          <input type="text" id="group-name" value="${group.name}" class="w-full px-4 py-2 border border-default input-bg card-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>

        ${
          session.manageQuantity !== false
            ? `
        <div class="mb-4 card-bg border border-default rounded-lg p-3">
          <div class="flex">
            <span class="icon icon-warning h-5 w-5 muted-text mr-2 flex-shrink-0"></span>
            <p class="text-sm muted-text">${t("alternatives.quantityInfo")}</p>
          </div>
        </div>
        `
            : ""
        }

        <div class="flex-1 overflow-y-auto mb-4">
          <label class="block text-sm font-medium secondary-text mb-2">${t("alternatives.options")}</label>
          <div id="options-container" class="space-y-4">
          </div>
          <button id="add-option-button" class="mt-2 text-sm secondary-text hover:opacity-80 font-medium flex items-center cursor-pointer">
            <span class="icon icon-plus h-4 w-4 mr-1"></span>
            ${t("alternatives.addOption")}
          </button>
        </div>

        <div class="flex justify-end space-x-4 pt-4 border-t">
          <button id="cancel-button" class="px-4 py-2 secondary-text font-medium hover:secondary-bg cursor-pointer rounded">${t("common.cancel")}</button>
          <button id="save-button" class="px-4 py-2 primary-bg primary-text font-medium cursor-pointer rounded flex items-center">${t("common.save")}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let optionCount = 0;
  const addOption = (initialProducts = []) => {
    optionCount++;
    const optionId = `option-${Date.now()}-${optionCount}`;
    const div = document.createElement("div");
    div.className = "secondary-bg p-3 rounded-lg border border-default relative";
    div.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-semibold secondary-text">Option ${optionCount}</span>
        <button class="muted-text hover:opacity-70 cursor-pointer remove-option-btn">
          <span class="icon icon-close h-5 w-5"></span>
        </button>
      </div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${products
          .map((p) => {
            const initialProd = initialProducts.find((ip) => ip.productId === p.id);
            return `
          <div class="flex items-center gap-2">
            <input type="checkbox" id="${optionId}-prod-${p.id}" value="${p.id}" class="product-checkbox h-4 w-4 accent-primary border-default rounded focus:ring-primary" ${initialProd ? "checked" : ""}>
            <label for="${optionId}-prod-${p.id}" class="flex-1 text-sm secondary-text truncate">${p.name}</label>
            ${
              session.manageQuantity !== false
                ? `
            <input type="number" id="${optionId}-qty-${p.id}" min="1" step="1" value="${initialProd ? initialProd.quantity : 1}" class="qty-input w-16 px-2 py-1 border border-default input-bg card-text rounded text-sm ${initialProd ? "" : "hidden"}">
            `
                : ""
            }
          </div>
        `;
          })
          .join("")}
      </div>
    `;

    div.querySelector(".remove-option-btn").addEventListener("click", () => {
      div.remove();
    });

    div.querySelectorAll(".product-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const prodId = e.target.value;
        const qtyInput = div.querySelector(`#${optionId}-qty-${prodId}`);
        if (qtyInput) {
          qtyInput.classList.toggle("hidden", !e.target.checked);
        }
      });
    });

    document.getElementById("options-container").appendChild(div);
  };

  if (group.options && group.options.length > 0) {
    group.options.forEach((opt) => addOption(opt.products));
  } else {
    addOption();
  }

  document.getElementById("add-option-button").addEventListener("click", () => addOption());

  const closeModal = () => {
    clearAllErrors(modal);
    document.body.removeChild(modal);
  };

  const saveGroup = () => {
    clearAllErrors(modal);

    if (!validateRequiredField("group-name", t("alternatives.groupName"))) {
      return;
    }

    const name = document.getElementById("group-name").value.trim();

    const options = [];
    let hasEmptyOption = false;
    document.querySelectorAll("#options-container > div").forEach((optDiv) => {
      const prods = [];
      optDiv.querySelectorAll(".product-checkbox:checked").forEach((cb) => {
        const productId = cb.value;
        const qtyInput = optDiv.querySelector(`[id$="-qty-${productId}"]`);
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
        prods.push({ productId, quantity });
      });

      if (prods.length > 0) {
        options.push({ products: prods });
      } else {
        optDiv.classList.add("error-border");
        hasEmptyOption = true;
      }
    });

    if (hasEmptyOption) {
      showOptionsError(t("alternatives.errorOptionEmpty"));
      return;
    } else {
      clearOptionsError();
    }

    if (options.length < 2) {
      showOptionsError(t("alternatives.errorMinOptions"));
      return;
    }

    const signatures = options.map((opt) => {
      const sorted = [...opt.products].sort((a, b) => a.productId.localeCompare(b.productId));
      return sorted.map((p) => `${p.productId}:${p.quantity}`).join("|");
    });

    const uniqueSignatures = new Set(signatures);
    if (uniqueSignatures.size !== options.length) {
      showOptionsError(t("alternatives.errorDuplicateOptions"));
      return;
    }

    actions.updateAlternativeGroup(group.id, { name, options }).then(() => {
      closeModal();
    });
  };

  function showOptionsError(message) {
    const container = document.getElementById("options-container");
    let errorMsg = container.nextElementSibling;
    if (!errorMsg || !errorMsg.classList.contains("field-error-message")) {
      errorMsg = document.createElement("p");
      errorMsg.className = "field-error-message text-sm error-text mt-1";
      container.parentNode.insertBefore(errorMsg, container.nextSibling);
    }
    errorMsg.textContent = message;
  }

  function clearOptionsError() {
    const container = document.getElementById("options-container");
    const errorMsg = container.nextElementSibling;
    if (errorMsg && errorMsg.classList.contains("field-error-message")) {
      errorMsg.remove();
    }
    document
      .querySelectorAll("#options-container > div")
      .forEach((d) => d.classList.remove("error-border"));
  }

  setupAutoFocus(modal);
  setupEscapeKey(modal, closeModal);
  setupEnterKey(modal, saveGroup);

  modal.querySelector("#modalOverlay").addEventListener("click", closeModal);
  modal.querySelector("#modalContent").addEventListener("click", (e) => e.stopPropagation());
  modal.querySelector("#cancel-button").addEventListener("click", closeModal);
  modal.querySelector("#save-button").addEventListener("click", saveGroup);
}
