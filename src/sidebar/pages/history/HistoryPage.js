import { renderHistoryView } from "./HistoryView.js";
import * as actions from "./HistoryActions.js";
import { Store } from "../../state.js";

export async function initHistoryPage(app) {
  const session = actions.getSession();

  if (!session) {
    Store.setState({ currentView: "sessions" });
    return;
  }

  const history = await actions.loadHistory();
  app.innerHTML = renderHistoryView({ history, session });
  attachEventListeners(history);
}

function attachEventListeners(history) {
  document.getElementById("back-button")?.addEventListener("click", actions.navigateToProducts);

  // Add click handlers for history items
  document.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () => {
      const index = parseInt(item.dataset.index, 10);
      const selectedResult = history[index];
      if (selectedResult) {
        actions.viewHistoricalResult(selectedResult);
      }
    });
  });
}
