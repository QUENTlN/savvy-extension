import { t } from "../../../shared/i18n.js";

export function renderAlternativesView({ session }) {
  const groups = session.alternativeGroups || [];

  return `
    <div class="mx-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center space-x-3">
          <button class="muted-text p-2 cursor-pointer" id="back-button">
            <span class="icon icon-back h-8 w-8"></span>
          </button>
          <h1 class="text-2xl pl-4 font-semibold card-text">${t("alternatives.title")}</h1>
        </div>
      </div>

      <div class="space-y-4">
        ${groups.length > 0 ? groups.map((group) => renderGroupCard(session, group)).join("") : `<div class="text-center muted-text py-8">${t("alternatives.noGroups")}</div>`}
      </div>

      <button id="new-group-button" class="w-full mt-6 flex items-center justify-center space-x-2 cursor-pointer primary-bg primary-text px-4 py-3 rounded-xl hover:opacity-90 transition-colors duration-200 shadow-sm">
        <span class="icon icon-plus h-5 w-5"></span>
        <span class="text-lg font-medium">${t("alternatives.newGroup")}</span>
      </button>
    </div>
  `;
}

function renderGroupCard(session, group) {
  return `
    <div class="card-bg rounded-xl shadow-md p-4 group-item">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0 mr-4">
          <h2 class="text-xl font-medium card-text truncate">${group.name}</h2>
          <div class="mt-2 space-y-1">
            ${group.options
              .map(
                (opt, idx) => `
              <div class="text-sm muted-text">
                <span class="font-medium">${t("alternatives.option")} ${idx + 1}:</span>
                ${
                  opt.products
                    ? opt.products
                        .map((p) => {
                          const prod = session.products.find(
                            (product) => product.id === p.productId
                          );
                          const qty = p.quantity > 1 ? ` (×${p.quantity})` : "";
                          return prod ? `${prod.name}${qty}` : t("offers.noProducts");
                        })
                        .join(" + ")
                    : t("offers.noProducts")
                }
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        <div class="flex space-x-2 flex-shrink-0">
          <button class="muted-text p-1 cursor-pointer edit-group-button" data-id="${group.id}">
            <span class="icon icon-edit h-6 w-6"></span>
          </button>
          <button class="muted-text p-1 cursor-pointer delete-group-button" data-id="${group.id}">
            <span class="icon icon-delete h-6 w-6"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}
