import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";

export function getSession() {
  return Store.state.sessions.find((s) => s.id === Store.state.currentSession);
}

export function navigateToProducts() {
  Store.setState({ currentView: "products" });
}

export function createAlternativeGroup(groupData) {
  return Store.sync(SidebarAPI.createAlternativeGroup(Store.state.currentSession, groupData));
}

export function updateAlternativeGroup(groupId, groupData) {
  return Store.sync(
    SidebarAPI.updateAlternativeGroup(Store.state.currentSession, groupId, groupData)
  );
}

export function deleteAlternativeGroup(groupId) {
  return Store.sync(SidebarAPI.deleteAlternativeGroup(Store.state.currentSession, groupId));
}
