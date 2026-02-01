import { renderSessionFormView, collectSessionFormData } from "./SessionFormView.js";
import * as actions from "../SessionsActions.js";
import { t } from "../../../../shared/i18n.js";
import { createModal } from "../../../utils/index.js";
import { clearAllErrors, validateRequiredField } from "../../../modals.js";

export function showEditSessionModal(session) {
  const { modal } = createModal(renderSessionFormView(session), {
    onSave: async () => {
      clearAllErrors(modal);

      if (!validateRequiredField("edit-session-name", t("sessions.sessionName"))) {
        return false;
      }

      const formData = collectSessionFormData(true);
      const updatedSession = { ...session, ...formData };

      await actions.updateSession(session.id, updatedSession);
    },
  });
}
