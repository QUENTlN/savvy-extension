import { t } from "../../../../shared/i18n.js";
import * as actions from "../OffersActions.js";
import { Store } from "../../../state.js";
import { showConfirmationModal } from "../../../utils/index.js";

export function showDeleteBundleModal(bundleId) {
  showConfirmationModal({
    title: t("bundles.deleteBundle"),
    message: t("bundles.confirmDelete"),
    onConfirm: async () => {
      await actions.deleteBundle(Store.state.currentSession, bundleId);
    },
  });
}
