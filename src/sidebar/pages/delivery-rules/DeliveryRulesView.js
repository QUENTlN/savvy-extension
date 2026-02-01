import { t } from "../../../shared/i18n.js";
import { getUniqueSellers, getRule } from "../../utils/sellers.js";
import { renderSellerRecapCard } from "./components/SellerRecapCard.js";

export function renderDeliveryRulesView({ session }) {
  return `
    <div class="mx-4 pb-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("deliveryRules.title")}</h1>
        </div>
      </div>

      <p class="text-sm muted-text mb-6">${t("deliveryRules.subtitle")}</p>

      <div class="space-y-4 seller-settings">
        <h3 class="text-lg font-semibold card-text mb-2 px-1">${t("deliveryRules.sellerRules")}</h3>
        ${getUniqueSellers(session)
          .map((seller) => {
            const rule = getRule(session, seller);
            return renderSellerRecapCard(session, seller, rule);
          })
          .join("")}
      </div>
    </div>
  `;
}
