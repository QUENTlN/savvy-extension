import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";

export function navigateToProducts(sessionId) {
  SidebarAPI.setCurrentSession(sessionId);
  Store.navigate("products", { currentSession: sessionId });
}

export function navigateToSettings() {
  Store.setState({ currentView: "settings" });
}

export function createSession(sessionData) {
  return Store.sync(SidebarAPI.createSession(sessionData));
}

export function updateSession(sessionId, data) {
  return Store.sync(SidebarAPI.updateSession(sessionId, data));
}

export function deleteSession(sessionId) {
  return Store.sync(SidebarAPI.deleteSession(sessionId));
}

export function sessionNameExists(name) {
  return Store.state.sessions.some((s) => s.name === name);
}
