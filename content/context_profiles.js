// context_profiles.js
function renderProfileContext(panel) {
  if (!panel) return;
  const linkedin_url = window.location.href.split('?')[0];

  // ── Profile Name Extraction ──────────────────────────────────────────
  let profile_name = "";
  let headline = "";

  if (document.title) {
    let cleanTitle = document.title.replace(/^\(\d+\)\s*/, "").replace(" | LinkedIn", "").trim();
    if (cleanTitle.includes(" - ")) {
      const parts = cleanTitle.split(" - ");
      profile_name = parts[0].trim();
      headline = parts.slice(1).join(" - ").trim();
    } else {
      profile_name = cleanTitle;
    }
  }

  if (!profile_name || profile_name === "LinkedIn" || profile_name === "Feed") {
    const h1s = document.querySelectorAll('h1');
    for (const h of h1s) {
      if (h.innerText && h.innerText.trim().length > 0) {
        profile_name = h.innerText.trim();
        break;
      }
    }
  }

  if (!headline) {
    const h2 = document.querySelector('.text-body-medium') ||
                document.querySelector('.pv-text-details__left-panel .text-body-medium');
    if (h2 && h2.innerText) headline = h2.innerText.trim();
  }

  if (!profile_name) profile_name = "Unknown Candidate";

  let currentRole = headline;
  let currentCompany = "";

  if (headline.includes(" at ")) {
    const parts = headline.split(" at ");
    currentRole = parts[0].trim();
    currentCompany = parts[1].trim();
  } else if (headline.includes(" | ")) {
    const parts = headline.split(" | ");
    currentRole = parts[0].trim();
    currentCompany = parts[parts.length - 1].trim();
  } else if (headline.includes(" @ ")) {
    const parts = headline.split(" @ ");
    currentRole = parts[0].trim();
    currentCompany = parts[1].trim();
  }

  // Escape for HTML attributes
  const safe = (s) => (s || "").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── Skeleton while loading ────────────────────────────────────────────
  panel.innerHTML = window.getPanelShell(`
    <div style="padding: 4px 0;">
      <div class="ri-skeleton" style="height: 24px; width: 50%; margin-bottom: 8px; border-radius: 6px;"></div>
      <div class="ri-skeleton" style="height: 16px; width: 85%; margin-bottom: 24px; border-radius: 4px;"></div>
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px; margin-bottom: 16px;"></div>
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px; margin-bottom: 16px;"></div>
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px;"></div>
    </div>
  `);

  // ── Fetch dashboard (existing referrals for this person) ─────────────
  chrome.runtime.sendMessage({ type: "FETCH_DASHBOARD" }, (dashRes) => {
    if (chrome.runtime.lastError || !panel) return;

    let candidateReferrals = [];
    if (dashRes && dashRes.success && dashRes.data) {
      const cleanURL = linkedin_url.replace(/\/$/, "");
      candidateReferrals = dashRes.data.filter(r =>
        r && r.linkedin_url && r.linkedin_url.split('?')[0].replace(/\/$/, "") === cleanURL
      );
    }

    // ── Fetch top 3 latest jobs for pre-fill ──────────────────────────
    chrome.runtime.sendMessage({ type: "FETCH_JOBS", payload: { limit: 3 } }, (jobsRes) => {
      if (chrome.runtime.lastError || !panel) return;

      const initialJobs = (jobsRes && jobsRes.success && Array.isArray(jobsRes.data)) ? jobsRes.data : [];

      // ── Build Active Pipelines HTML ────────────────────────────────
      let pipelinesHTML = "";
      if (candidateReferrals.length > 0) {
        let refsHTML = "";
        for (const r of candidateReferrals) {
          const connStatus = r.connection_status || "Pending";
          const refStatus = r.status || "";
          const connBadgeClass = connStatus === "Connected" ? "badge-green" : "badge-orange";
          let refBadgeClass = "badge-gray";
          if (refStatus === "Referred") refBadgeClass = "badge-green";
          else if (refStatus === "Messaged") refBadgeClass = "badge-blue";

          refsHTML += `
            <div style="background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:2px;">${safe(r.company_name)}</div>
              <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">${safe(r.role_title)}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="badge ${connBadgeClass}">&#128279; ${connStatus}</span>
                ${refStatus ? `<span class="badge ${refBadgeClass}">&#128203; ${refStatus}</span>` : ''}
              </div>
            </div>`;
        }
        pipelinesHTML = `
          <div style="margin-bottom:24px;">
            <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Active Pipelines</div>
            ${refsHTML}
          </div>
          <div style="width:100%;height:1px;background:var(--line);margin-bottom:24px;"></div>`;
      }

      // ── Pre-fill the latest job ────────────────────────────────────
      const latestJob = initialJobs.length > 0 ? initialJobs[0] : null;
      const latestJobStr = latestJob
        ? `${latestJob.company_name || 'Unknown'} - ${latestJob.role_title || 'Unknown'}`
        : "";
      const latestJobId = latestJob ? String(latestJob.id) : "";

      // ── Render the full panel ──────────────────────────────────────
      panel.innerHTML = window.getPanelShell(`
        ${pipelinesHTML}
        <div style="margin-bottom:24px;">
          <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Log Outreach</div>
          <div class="ri-form-group">
            <label class="ri-label">Candidate Name</label>
            <input id="ri-prof-name" class="ri-input" value="${safe(profile_name)}" autocomplete="off" />
          </div>
          <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div class="ri-form-group" style="flex:1;margin-bottom:0;">
              <label class="ri-label">Current Role</label>
              <input id="ri-prof-role" class="ri-input" placeholder="e.g. Engineer" value="${safe(currentRole)}" autocomplete="off" />
            </div>
            <div class="ri-form-group" style="flex:1;margin-bottom:0;">
              <label class="ri-label">Current Company</label>
              <input id="ri-prof-company" class="ri-input" placeholder="e.g. Acme" value="${safe(currentCompany)}" autocomplete="off" />
            </div>
          </div>
          <div class="ri-form-group">
            <label class="ri-label">Role Pitching</label>
            <div id="ri-prof-job-dropdown" style="position:relative;">
              <input type="hidden" id="ri-prof-job-id" value="${safe(latestJobId)}" />
              <input type="text" id="ri-prof-job-search" class="ri-input" placeholder="Select or search role..." autocomplete="off" />
              <div id="ri-prof-job-menu" class="ri-dropdown-menu"></div>
            </div>
          </div>
          <button id="ri-prof-log-btn" class="ri-btn ri-btn-primary" style="width:100%;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Log Candidate
          </button>
          <div id="ri-status" class="ri-status"></div>
        </div>
      `);

      // ── Get direct DOM references immediately after render ─────────
      const searchEl = panel.querySelector("#ri-prof-job-search");
      const menu     = panel.querySelector("#ri-prof-job-menu");
      const idInput  = panel.querySelector("#ri-prof-job-id");
      const dropdown = panel.querySelector("#ri-prof-job-dropdown");
      const btn      = panel.querySelector("#ri-prof-log-btn");
      const statusEl = panel.querySelector("#ri-status");

      // Set pre-filled value directly via JS (not HTML attribute, avoids encoding issues)
      if (searchEl && latestJobStr) searchEl.value = latestJobStr;

      // ── Dropdown: render job items ─────────────────────────────────
      function renderItems(jobs) {
        if (!menu) return;
        menu.innerHTML = "";
        if (!jobs || jobs.length === 0) {
          const empty = document.createElement("div");
          empty.className = "ri-dropdown-item";
          empty.innerHTML = `<span style="color:var(--muted);font-size:12px;">No jobs found</span>`;
          menu.appendChild(empty);
          return;
        }
        for (const job of jobs) {
          const div = document.createElement("div");
          div.className = "ri-dropdown-item";
          const dateStr = new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const label = `${job.company_name || 'Unknown'} - ${job.role_title || 'Unknown'}`;
          div.innerHTML = `
            <span class="ri-dropdown-item-title">${label}</span>
            <span class="ri-dropdown-item-date">${dateStr}</span>`;
          // mousedown fires before blur, so selection works without fighting focus loss
          div.addEventListener("mousedown", (e) => {
            e.preventDefault(); // prevent search box from losing focus and closing menu
            if (idInput) idInput.value = String(job.id);
            if (searchEl) searchEl.value = label;
            if (menu) menu.classList.remove("open");
          });
          menu.appendChild(div);
        }
      }

      function openDropdown() {
        if (menu) menu.classList.add("open");
      }

      function closeDropdown() {
        if (menu) menu.classList.remove("open");
      }

      // Show the 3 pre-fetched jobs instantly (no API call)
      function showInitialDropdown() {
        renderItems(initialJobs);
        openDropdown();
      }

      // Debounced live API search
      let searchTimer = null;
      function searchJobs(query) {
        if (searchTimer) clearTimeout(searchTimer);
        if (!menu) return;
        menu.innerHTML = `<div class="ri-dropdown-item"><span style="color:var(--muted);font-size:12px;">Searching...</span></div>`;
        openDropdown();
        searchTimer = setTimeout(() => {
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: "FETCH_JOBS", payload: { q: query, limit: 10 } }, (res) => {
              if (chrome.runtime.lastError) return;
              renderItems(res && res.success && Array.isArray(res.data) ? res.data : []);
            });
          }
        }, 300);
      }

      if (searchEl) {
        searchEl.addEventListener("focus", () => {
          searchEl.select();
          const val = searchEl.value.trim();
          // If empty or still showing the auto-filled latest job, show top-3
          if (!val || val === latestJobStr) {
            showInitialDropdown();
          } else {
            searchJobs(val);
          }
        });

        searchEl.addEventListener("input", (e) => {
          const val = e.target.value.trim();
          if (!val) {
            showInitialDropdown();
          } else {
            searchJobs(val);
          }
        });

        // Close dropdown when clicking outside — scoped to panel, not entire document
        panel.addEventListener("click", (e) => {
          if (dropdown && !dropdown.contains(e.target)) {
            closeDropdown();
          }
        });
      }

      // ── Log Candidate button ───────────────────────────────────────
      if (btn) {
        btn.addEventListener("click", () => {
          const job_id = idInput ? parseInt(idInput.value, 10) : 0;
          const final_name    = panel.querySelector("#ri-prof-name")    ? panel.querySelector("#ri-prof-name").value.trim()    : "";
          const final_role    = panel.querySelector("#ri-prof-role")    ? panel.querySelector("#ri-prof-role").value.trim()    : "";
          const final_company = panel.querySelector("#ri-prof-company") ? panel.querySelector("#ri-prof-company").value.trim() : "";

          if (!statusEl) return;

          if (isNaN(job_id) || job_id === 0) {
            statusEl.innerText = "Please select a valid role from the dropdown.";
            statusEl.className = "ri-status ri-error";
            return;
          }
          if (!final_name) {
            statusEl.innerText = "Candidate Name is required.";
            statusEl.className = "ri-status ri-error";
            return;
          }

          btn.disabled = true;
          statusEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Logging candidate...`;
          statusEl.className = "ri-status ri-loading";

          chrome.runtime.sendMessage({
            type: "LOG_OUTREACH",
            payload: {
              job_posting_id: job_id,
              linkedin_url:   window.location.href.split('?')[0],
              profile_name:   final_name,
              current_company: final_company,
              current_role:   final_role
            }
          }, (res) => {
            if (chrome.runtime.lastError) {
              btn.disabled = false;
              statusEl.innerText = "Extension error. Please refresh the page.";
              statusEl.className = "ri-status ri-error";
              return;
            }
            btn.disabled = false;
            if (res && res.success) {
              statusEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Candidate Logged`;
              statusEl.className = "ri-status ri-success";
              const panelEl = document.getElementById("ri-panel");
              if (panelEl) setTimeout(() => window.renderProfileContext(panelEl), 1200);
            } else {
              statusEl.innerText = (res && res.error) ? res.error : "Network error. Try again.";
              statusEl.className = "ri-status ri-error";
            }
          });
        });
      }
    }); // end FETCH_JOBS
  }); // end FETCH_DASHBOARD
}

window.renderProfileContext = renderProfileContext;
