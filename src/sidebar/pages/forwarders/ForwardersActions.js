import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";

export function getSession() {
  return Store.state.sessions.find((s) => s.id === Store.state.currentSession);
}

export function navigateToProducts() {
  Store.setState({ currentView: "products", currentForwarderEditing: null });
}

export function navigateToEditor(forwarderId) {
  Store.setState({ currentForwarderEditing: forwarderId });
}

export function createForwarder(forwarder) {
  return Store.sync(SidebarAPI.createForwarder(Store.state.currentSession, forwarder));
}

export function deleteForwarder(forwarderId) {
  return Store.sync(SidebarAPI.deleteForwarder(Store.state.currentSession, forwarderId));
}
