import { t } from "../../../../shared/i18n.js";
import * as actions from "../SessionsActions.js";
import { showConfirmationModal } from "../../../utils/index.js";

export function showDeleteSessionModal(sessionId) {
  showConfirmationModal({
    title: t("sessions.confirmDelete"),
    onConfirm: async () => {
      await actions.deleteSession(sessionId);
    },
  });
}
