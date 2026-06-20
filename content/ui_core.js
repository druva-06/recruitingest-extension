// ui_core.js
let isPanelOpen = false;

function injectFAB() {
  if (document.getElementById("ri-fab")) return;

  const fab = document.createElement("div");
  fab.id = "ri-fab";
  fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  fab.title = "RecruitIngest CRM";
  
  const panel = document.createElement("div");
  panel.id = "ri-panel";

  panel.addEventListener("click", (e) => {
    const closeBtn = e.target.closest(".ri-close-btn");
    if (closeBtn) {
      const fab = document.getElementById("ri-fab");
      if (fab) fab.click();
      return;
    }

    const acceptBtn = e.target.closest(".ri-accept-btn");
    if (acceptBtn) {
      const refId = parseInt(acceptBtn.dataset.referralId, 10);
      if (!isNaN(refId) && window.markAccepted) {
        window.markAccepted(refId, acceptBtn);
      }
    }
  });

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  fab.addEventListener("click", () => {
    isPanelOpen = !isPanelOpen;
    panel.style.display = isPanelOpen ? "flex" : "none";
    if (isPanelOpen && window.renderPanelContext) {
      window.renderPanelContext();
    }
  });
}

function closePanel() {
  isPanelOpen = false;
  document.getElementById("ri-panel").style.display = "none";
}

function getPanelShell(contentHTML) {
  return `
    <div class="ri-header">
      <div class="ri-header-brand">
        <div class="ri-logo-icon">RI</div>
        <span>RecruitIngest</span>
      </div>
      <button class="ri-close-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="ri-body">
      ${contentHTML}
    </div>
  `;
}

function renderPanelContext() {
  const panel = document.getElementById("ri-panel");
  
  // Show a loading spinner while checking auth
  panel.innerHTML = getPanelShell(`
    <div style="display:flex; justify-content:center; align-items:center; height:200px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
    </div>
  `);

  window.riSend({ type: "CHECK_AUTH" }, (res, err) => {
    if (err || !res || !res.authenticated) {
      // Show Sign In Wall
      panel.innerHTML = getPanelShell(`
        <div class="ri-auth-wall">
          <div class="ri-auth-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 class="ri-auth-title">Sign In Required</h2>
          <p class="ri-auth-desc">Please sign in to your RecruitIngest account to use the extension.</p>
          <a href="http://localhost:5173/" target="_blank" class="ri-btn-signin" style="text-decoration:none;">
            Sign In to RecruitIngest
          </a>
        </div>
      `);
      return;
    }

    // Authenticated, proceed with normal rendering
    const url = window.location.href;
    const isLinkedIn = url.includes("linkedin.com");

    if (isLinkedIn && url.includes("/in/") && window.renderProfileContext) {
      window.renderProfileContext(panel);
    } else if (isLinkedIn && url.includes("/mynetwork/invite-connect/connections") && window.renderConnectionsContext) {
      window.renderConnectionsContext(panel);
    } else if (window.renderJobContext) {
      window.renderJobContext(panel);
    }
  });
}

// Make globally available for other scripts
window.injectFAB = injectFAB;
window.closePanel = closePanel;
window.getPanelShell = getPanelShell;
window.renderPanelContext = renderPanelContext;
window.isPanelOpen = () => isPanelOpen;

/**
 * riSend — safe chrome.runtime.sendMessage wrapper.
 *
 * chrome.runtime.sendMessage THROWS SYNCHRONOUSLY with "Extension context
 * invalidated" when the extension is reloaded without refreshing the page.
 * Checking chrome.runtime.lastError inside the callback is not enough —
 * the throw happens before the callback is ever invoked.
 *
 * Usage:
 *   window.riSend({ type: "FETCH_DASHBOARD" }, (res, err) => {
 *     if (err) { // show friendly error; return }
 *     // use res
 *   });
 */
window.riSend = function(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError
        ? chrome.runtime.lastError.message
        : null;
      if (callback) callback(response, err);
    });
  } catch (e) {
    // Context invalidated — pass the error to the callback so callers can
    // show a "please refresh the page" message instead of crashing.
    if (callback) callback(null, e.message || "Extension context invalidated");
  }
};
