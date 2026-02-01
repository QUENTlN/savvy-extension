import { renderSessionFormView, collectSessionFormData } from "./SessionFormView.js";
import * as actions from "../SessionsActions.js";
import { t } from "../../../../shared/i18n.js";
import { createModal } from "../../../utils/index.js";
import { clearAllErrors, validateRequiredField, showFieldError } from "../../../modals.js";

export function showNewSessionModal() {
  const { modal } = createModal(renderSessionFormView(), {
    onSave: async () => {
      clearAllErrors(modal);

      if (!validateRequiredField("session-name", t("sessions.sessionName"))) {
        return false;
      }

      const formData = collectSessionFormData(false);

      if (actions.sessionNameExists(formData.name)) {
        showFieldError("session-name", t("sessions.sessionExists"));
        return false;
      }

      await actions.createSession(formData);
    },
  });
}
