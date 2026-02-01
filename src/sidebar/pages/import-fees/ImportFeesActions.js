import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";

export function getSession() {
  return Store.state.sessions.find((s) => s.id === Store.state.currentSession);
}

export function navigateToProducts() {
  Store.setState({ currentView: "products" });
}

export function createCustomsCategory(categoryData, defaultVAT) {
  return Store.sync(
    SidebarAPI.createCustomsCategory(Store.state.currentSession, categoryData, defaultVAT)
  );
}

export function updateCustomsCategory(categoryId, categoryData, defaultVAT) {
  return Store.sync(
    SidebarAPI.updateCustomsCategory(
      Store.state.currentSession,
      categoryId,
      categoryData,
      defaultVAT
    )
  );
}

export function deleteCustomsCategory(categoryId, defaultVAT) {
  return Store.sync(
    SidebarAPI.deleteCustomsCategory(Store.state.currentSession, categoryId, defaultVAT)
  );
}

export function saveImportFees(session, defaultVAT) {
  session.defaultVAT = defaultVAT;
  return Store.sync(SidebarAPI.updateSession(Store.state.currentSession, session)).then(() => {
    Store.navigate("products");
  });
}
