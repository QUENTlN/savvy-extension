// Session export/import utilities
import { t } from "../../shared/i18n.js";
import { Store } from "../state.js";
import { SidebarAPI } from "../api.js";
import { showToast } from "./toast.js";

export function exportSession(session) {
  const dataStr =
    "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `session-${session.name}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function importSession() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (readerEvent) => {
      try {
        const content = readerEvent.target.result;
        const sessionData = JSON.parse(content);

        if (!sessionData.name || !Array.isArray(sessionData.products)) {
          showToast(t("sessions.invalidFormat"), { type: "error" });
          return;
        }

        // Check for name collision
        let name = sessionData.name;
        while (Store.state.sessions.some((s) => s.name === name)) {
          name = prompt(
            `The session name "${name}" is already taken. Please enter a new name:`,
            name + " (Imported)"
          );
          if (name === null) return;
          name = name.trim();
          if (!name) return;
        }
        sessionData.name = name;

        Store.sync(SidebarAPI.createSession(name)).then((response) => {
          const newSessionId = response.currentSession;
          const updatedSession = {
            ...sessionData,
            id: newSessionId,
            created: new Date().toISOString(),
          };

          Store.sync(SidebarAPI.updateSession(newSessionId, updatedSession));
        });
      } catch (err) {
        showToast("Error parsing session file: " + err.message, { type: "error" });
      }
    };
  };

  input.click();
}
