import { Store } from "../../state.js";
import { SidebarAPI } from "../../api.js";

// Re-export seller utilities
export {
  getUniqueSellers,
  ensureDefaultRule,
  getRule,
  getSellerProducts,
} from "../../utils/sellers.js";

export function getSession() {
  return Store.state.sessions.find((s) => s.id === Store.state.currentSession);
}

export function navigateToProducts() {
  Store.setState({ currentView: "products" });
}

export function navigateToList() {
  Store.setState({ currentRulesView: "list", currentSellerEditing: null });
}

export function navigateToEditSeller(seller) {
  Store.setState({ currentSellerEditing: seller, currentRulesView: "edit" });
}

export function getCurrentSellerEditing() {
  return Store.state.currentSellerEditing;
}

export function isInEditMode() {
  return Store.state.currentRulesView === "edit" && Store.state.currentSellerEditing;
}

export async function ensureDefaultRulesForAllSellers(session) {
  const { getUniqueSellers, ensureDefaultRule } = await import("../../utils/sellers.js");
  const sellers = getUniqueSellers(session);
  let hasNewRules = false;

  sellers.forEach((seller) => {
    const created = ensureDefaultRule(session, seller);
    if (created) {
      hasNewRules = true;
    }
  });

  if (hasNewRules) {
    await Store.sync(SidebarAPI.updateSession(Store.state.currentSession, session));
  }

  return hasNewRules;
}

export function saveSellerRule(seller, ruleData) {
  const session = getSession();
  if (!session) return Promise.resolve();

  if (!session.deliveryRules) session.deliveryRules = [];

  const currentRule = { seller, ...ruleData };

  const ruleIndex = session.deliveryRules.findIndex((r) => r.seller === seller);
  if (ruleIndex > -1) {
    session.deliveryRules[ruleIndex] = currentRule;
  } else {
    session.deliveryRules.push(currentRule);
  }

  return Store.sync(SidebarAPI.updateSession(Store.state.currentSession, session)).then(() => {
    navigateToList();
  });
}

export function getCurrency() {
  return Store.state.currency;
}
