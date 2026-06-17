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
  const url = window.location.href;

  if (url.includes("/jobs/") && window.renderJobContext) {
    window.renderJobContext(panel);
  } else if (url.includes("/in/") && window.renderProfileContext) {
    window.renderProfileContext(panel);
  } else if (url.includes("/mynetwork/invite-connect/connections") && window.renderConnectionsContext) {
    window.renderConnectionsContext(panel);
  } else {
    panel.innerHTML = getPanelShell(`
      <div class="ri-title-context">Awaiting Context</div>
      <div class="ri-subtitle">Navigate to a LinkedIn Profile, a Job Posting, or your Connections page to automatically activate the CRM.</div>
      <div style="text-align: center; color: #9ca3af; margin-top: 20px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </div>
    `);
  }
}

// Make globally available for other scripts
window.injectFAB = injectFAB;
window.closePanel = closePanel;
window.getPanelShell = getPanelShell;
window.renderPanelContext = renderPanelContext;
window.isPanelOpen = () => isPanelOpen;
