import { t } from "../../../../shared/i18n.js";
import * as actions from "../AlternativesActions.js";
import { showConfirmationModal } from "../../../utils/index.js";

export function showDeleteAlternativeGroupModal(groupId) {
  showConfirmationModal({
    title: t("alternatives.deleteGroup"),
    message: t("alternatives.confirmDelete"),
    confirmText: t("alternatives.deleteButton"),
    onConfirm: async () => {
      await actions.deleteAlternativeGroup(groupId);
    },
  });
}
