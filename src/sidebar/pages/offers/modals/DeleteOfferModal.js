import { t } from "../../../../shared/i18n.js";
import * as actions from "../OffersActions.js";
import { Store } from "../../../state.js";
import { showConfirmationModal } from "../../../utils/index.js";

export function showDeleteOfferModal(offerId) {
  showConfirmationModal({
    title: t("offers.deleteOffer"),
    message: t("offers.confirmDelete"),
    onConfirm: async () => {
      await actions.deleteOffer(Store.state.currentSession, Store.state.currentProduct, offerId);
    },
  });
}
