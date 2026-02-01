import { t } from "../../../shared/i18n.js";
import { renderSellerRulesView } from "./SellerRulesView.js";
import * as actions from "./SellerRulesActions.js";
import { getTierType, performLiveValidation } from "../../components/fees/index.js";

const getApp = () => document.getElementById("app");

export function initSellerRulesPage(seller) {
  const app = getApp();
  const session = actions.getSession();
  const rule = actions.getRule(session, seller);
  const safeSellerId = seller.replace(/\s+/g, "-");
  const copiedFrom = rule.copiedFrom || "None";

  app.innerHTML = renderSellerRulesView({
    session,
    seller,
    rule,
    safeSellerId,
    copiedFrom,
    getSellerProducts: actions.getSellerProducts,
  });

  const sellerCard = document.querySelector(".seller-card");
  if (!sellerCard) return;

  attachEventListeners(sellerCard, session, seller, safeSellerId);
}

function attachEventListeners(sellerCard, session, seller, safeSellerId) {
  // Back button
  document.getElementById("back-to-list-button")?.addEventListener("click", actions.navigateToList);

  // Same seller selector
  actions.setupSameSellerListener(sellerCard);

  // Currency selector
  actions.setupCurrencyChangeListener(sellerCard);

  // Billing method radios
  actions.setupBillingMethodListeners(sellerCard, safeSellerId);

  // Global free shipping toggle
  actions.setupFreeShippingToggle(
    sellerCard,
    ".global-free-shipping-checkbox",
    ".global-free-shipping-threshold"
  );

  // Add group button
  actions.setupAddGroupButtonListener(session, seller, safeSellerId);

  // Delete group buttons (delegation)
  sellerCard.addEventListener("click", (e) => {
    if (e.target.closest(".delete-group-btn")) {
      e.target.closest(".group-item").remove();
    }
  });

  // Change events (delegation)
  sellerCard.addEventListener("change", (e) => {
    // Group free shipping toggle
    if (e.target.classList.contains("group-free-shipping-checkbox")) {
      const groupItem = e.target.closest(".group-item");
      const thresholdDiv = groupItem.querySelector(".group-free-shipping-threshold");
      if (thresholdDiv) thresholdDiv.style.display = e.target.checked ? "block" : "none";
    }

    // Calculation type radio
    if (e.target.classList.contains("calculation-type-radio")) {
      actions.handleCalculationTypeChange(e);
    }

    // Tiered toggle
    if (
      e.target.classList.contains("is-tiered-toggle") ||
      e.target.classList.contains("is-tiered-checkbox")
    ) {
      actions.handleTieredToggle(e);
    }

    // Unit change
    if (e.target.name && e.target.name.endsWith("_unit")) {
      const container = e.target.closest(".calculation-rules-container");
      actions.handleUnitChange(e, container);
    }

    // Tier value mode toggle
    if (e.target.classList.contains("tier-value-mode-toggle")) {
      const container = e.target.closest(".calculation-rules-container");
      actions.handleTierValueModeChange(e, container);
    }

    // Tier value type change
    if (e.target.name && e.target.name.endsWith("_tierValueType")) {
      const container = e.target.closest(".calculation-rules-container");
      actions.handleTierValueTypeChange(e, container);
    }

    // Max field change (update next row's min)
    if (e.target.name && e.target.name.includes("_range_") && e.target.name.endsWith("_max")) {
      const container = e.target.closest(".calculation-rules-container");
      actions.handleMaxChange(e, container);
    }

    // Packing mode change
    if (e.target.name && e.target.name.endsWith("_packingMode")) {
      actions.handlePackingModeChange(e);
    }
  });

  // Blur events for live validation (delegation)
  sellerCard.addEventListener(
    "blur",
    (e) => {
      const input = e.target;

      if (input.tagName !== "INPUT") return;

      const container = input.closest(".calculation-rules-container");
      if (!container) return;

      const prefix = container.dataset.prefix;

      // Tier input field validation
      if (input.name && input.name.includes("_range_")) {
        const isTieredCb = container.querySelector(`input[name="${prefix}_isTiered"]`);

        if (isTieredCb && isTieredCb.checked) {
          const type = getTierType(container);

          if (["quantity", "distance", "weight", "volume"].includes(type)) {
            performLiveValidation(input, container);
          }
        }
      }
      // Fixed amount field validation
      else if (input.name === `${prefix}_amount`) {
        const value = parseFloat(input.value);
        if (isNaN(value) || input.value.trim() === "") {
          input.classList.add("!border-orange-500", "focus:!ring-orange-500");

          let errorDiv = input.parentElement.querySelector(".field-error-message");
          if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.className = "field-error-message text-xs text-orange-500 mt-1";
            input.parentElement.appendChild(errorDiv);
          }
          errorDiv.textContent = t("validation.tier.mustBeNumber");
        } else {
          input.classList.remove("!border-orange-500", "focus:!ring-orange-500");
          const errorDiv = input.parentElement.querySelector(".field-error-message");
          if (errorDiv) errorDiv.remove();
        }
      }
      // Percentage rate field validation
      else if (input.name === `${prefix}_rate`) {
        const value = parseFloat(input.value);
        if (isNaN(value) || input.value.trim() === "") {
          input.classList.add("!border-orange-500", "focus:!ring-orange-500");

          let errorDiv = input.parentElement.querySelector(".field-error-message");
          if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.className = "field-error-message text-xs text-orange-500 mt-1";
            input.parentElement.appendChild(errorDiv);
          }
          errorDiv.textContent = t("validation.tier.mustBeNumber");
        } else {
          input.classList.remove("!border-orange-500", "focus:!ring-orange-500");
          const errorDiv = input.parentElement.querySelector(".field-error-message");
          if (errorDiv) errorDiv.remove();
        }
      }
    },
    true
  );

  // Click events for add/remove range (delegation)
  sellerCard.addEventListener("click", (e) => {
    if (e.target.closest(".add-range-btn")) {
      const container = e.target.closest(".calculation-rules-container");
      actions.handleAddRange(e, container);
    }

    if (e.target.closest(".remove-range-btn")) {
      actions.handleRemoveRange(e);
    }

    // Forwarder chain: add forwarder
    if (e.target.closest(".add-forwarder-to-chain-btn")) {
      actions.handleAddForwarderToChain(session, seller);
    }

    // Forwarder chain: move up
    if (e.target.closest(".move-up-btn")) {
      const index = parseInt(e.target.closest(".move-up-btn").dataset.index);
      actions.handleMoveForwarderUp(seller, index);
    }

    // Forwarder chain: move down
    if (e.target.closest(".move-down-btn")) {
      const index = parseInt(e.target.closest(".move-down-btn").dataset.index);
      actions.handleMoveForwarderDown(seller, index);
    }

    // Forwarder chain: remove forwarder
    if (e.target.closest(".remove-forwarder-btn")) {
      const index = parseInt(e.target.closest(".remove-forwarder-btn").dataset.index);
      actions.handleRemoveForwarder(seller, index);
    }
  });

  // Save button
  document.getElementById("save-seller-rules").addEventListener("click", () => {
    actions.saveSellerRules(seller, safeSellerId, session);
  });
}
