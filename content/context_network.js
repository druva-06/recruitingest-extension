// context_network.js
function renderConnectionsContext(panel) {
  panel.innerHTML = window.getPanelShell(`
    <div class="ri-title-context">Sync Network</div>
    <div class="ri-subtitle">Mark visible connections as <strong>Connected</strong> — updates their LinkedIn connection status in your CRM.</div>
    
    <button id="ri-conn-btn" class="ri-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
      Sync Visible Cards
    </button>
    <div id="ri-status" class="ri-status"></div>
  `);

  document.getElementById("ri-conn-btn").addEventListener("click", () => {
    const btn = document.getElementById("ri-conn-btn");
    const status = document.getElementById("ri-status");
    const links = document.querySelectorAll('.mn-connection-card__link');
    const urls = Array.from(links).map(a => a.href.split('?')[0]);

    if (urls.length === 0) {
      status.innerText = "No connection cards found. Scroll down first.";
      status.className = "ri-status ri-error";
      return;
    }

    btn.disabled = true;
    status.innerText = "Syncing with database...";
    status.className = "ri-status ri-loading";

    window.riSend({ type: "BATCH_UPDATE", payload: { linkedin_urls: urls } }, (res, err) => {
      if (err) {
        btn.disabled = false;
        status.innerText = "Extension error — please refresh the page.";
        status.className = "ri-status ri-error";
        return;
      }
      btn.disabled = false;
      if (res && res.success) {
        status.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Marked ${res.data.updated_count} as Connected`;
        status.className = "ri-status ri-success";
      } else {
        status.innerText = "Sync failed.";
        status.className = "ri-status ri-error";
      }
    });
  });
}

window.renderConnectionsContext = renderConnectionsContext;
