// context_profiles.js
function renderProfileContext(panel) {
  const linkedin_url = window.location.href.split('?')[0]; 
  
  // Robust Profile Name Extraction
  let profile_name = "";
  let headline = "";
  
  if (document.title) {
    // Remove notification counts like "(3) "
    let cleanTitle = document.title.replace(/^\(\d+\)\s*/, "");
    cleanTitle = cleanTitle.replace(" | LinkedIn", "").trim();
    
    if (cleanTitle.includes(" - ")) {
      const parts = cleanTitle.split(" - ");
      profile_name = parts[0].trim();
      headline = parts.slice(1).join(" - ").trim();
    } else {
      profile_name = cleanTitle;
    }
  }

  // Backup method for name: Find the first visible h1 with text
  if (!profile_name || profile_name === "LinkedIn" || profile_name === "Feed") {
    const h1s = document.querySelectorAll('h1');
    for (let h of h1s) {
      if (h.innerText && h.innerText.trim().length > 0) {
        profile_name = h.innerText.trim();
        break;
      }
    }
  }
  
  // Backup method for headline
  if (!headline) {
    const h2 = document.querySelector('.text-body-medium') || document.querySelector('.pv-text-details__left-panel .text-body-medium');
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

  // Sanitize for HTML attributes
  profile_name = profile_name.replace(/"/g, '&quot;');
  currentRole = currentRole.replace(/"/g, '&quot;');
  currentCompany = currentCompany.replace(/"/g, '&quot;');

  panel.innerHTML = window.getPanelShell(`
    <div style="padding: 4px 0;">
      <div class="ri-skeleton" style="height: 24px; width: 50%; margin-bottom: 8px; border-radius: 6px;"></div>
      <div class="ri-skeleton" style="height: 16px; width: 85%; margin-bottom: 24px; border-radius: 4px;"></div>
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px; margin-bottom: 16px;"></div>
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px; margin-bottom: 16px;"></div>
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px;"></div>
    </div>
  `);

  window.markAccepted = function(referralId, btnElement) {
    btnElement.innerHTML = '<span class="spin" style="display:inline-block;width:12px;height:12px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;"></span>';
    btnElement.disabled = true;
    chrome.runtime.sendMessage({ 
      type: "UPDATE_REFERRAL_STATUS", 
      payload: { referral_request_id: referralId, status: "Accepted" } 
    }, (res) => {
      if (chrome.runtime.lastError) {
        btnElement.innerHTML = 'Error';
        btnElement.disabled = false;
        return;
      }
      if (res && res.success) {
        btnElement.innerHTML = '✓ Accepted';
        btnElement.style.background = 'var(--green)';
        btnElement.style.color = '#fff';
        btnElement.style.border = 'none';
        setTimeout(() => { window.renderProfileContext(document.getElementById("ri-panel")); }, 1000);
      } else {
        btnElement.innerHTML = 'Error';
        btnElement.disabled = false;
      }
    });
  };

  chrome.runtime.sendMessage({ type: "FETCH_DASHBOARD" }, (dashRes) => {
    if (chrome.runtime.lastError) return;
    let candidateReferrals = [];
    if (dashRes && dashRes.success && dashRes.data) {
      candidateReferrals = dashRes.data.filter(r => r && r.linkedin_url && r.linkedin_url.split('?')[0].replace(/\/$/, "") === linkedin_url.replace(/\/$/, ""));
    }

    chrome.runtime.sendMessage({ type: "FETCH_JOBS" }, (jobsRes) => {
      if (chrome.runtime.lastError) return;
      let allJobs = [];
      if (jobsRes && jobsRes.success && jobsRes.data) {
        allJobs = jobsRes.data;
        allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      let pipelinesHTML = "";
      if (candidateReferrals.length > 0) {
        let refsHTML = "";
        for (let i = 0; i < candidateReferrals.length; i++) {
          const r = candidateReferrals[i];
          const badgeClass = r.status === 'Referred' ? 'badge-green' : (r.status === 'Pending' ? 'badge-orange' : 'badge-gray');
          const actionHTML = r.status === 'Pending' 
            ? `<button class="ri-btn ri-accept-btn" style="padding: 6px 12px; font-size: 12px; height: auto; width: auto;" data-referral-id="${r.referral_id}">Mark Accepted</button>`
            : `<span style="font-size: 12px; color: var(--muted); font-weight: 500;">✓ Active</span>`;
            
          refsHTML += `
            <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 2px;">${r.company_name}</div>
                <div style="font-size: 12px; color: var(--muted); margin-bottom: 6px;">${r.role_title}</div>
                <span class="badge ${badgeClass}">${r.status}</span>
              </div>
              <div>
                ${actionHTML}
              </div>
            </div>
          `;
        }

        pipelinesHTML = `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Active Pipelines</div>
            ${refsHTML}
          </div>
          <div style="width: 100%; height: 1px; background: var(--line); margin-bottom: 24px;"></div>
        `;
      }

      panel.innerHTML = window.getPanelShell(`
        ${pipelinesHTML}
        <div style="margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Log Outreach</div>
          <div class="ri-form-group">
            <label class="ri-label">Candidate Name</label>
            <input id="ri-prof-name" class="ri-input" value="${profile_name}" autocomplete="off" />
          </div>
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div class="ri-form-group" style="flex: 1; margin-bottom: 0;">
              <label class="ri-label">Current Role</label>
              <input id="ri-prof-role" class="ri-input" placeholder="e.g. Engineer" value="${currentRole}" autocomplete="off" />
            </div>
            <div class="ri-form-group" style="flex: 1; margin-bottom: 0;">
              <label class="ri-label">Current Company</label>
              <input id="ri-prof-company" class="ri-input" placeholder="e.g. Acme" value="${currentCompany}" autocomplete="off" />
            </div>
          </div>
          
          <div class="ri-form-group">
            <label class="ri-label">Role Pitching</label>
            <div class="ri-dropdown" id="ri-prof-job-dropdown">
              <input type="hidden" id="ri-prof-job-id" value="" />
              <input type="text" id="ri-prof-job-search" class="ri-input" placeholder="Select or search role..." autocomplete="off" />
              <div class="ri-dropdown-menu" id="ri-prof-job-menu"></div>
            </div>
          </div>
          
          <button id="ri-prof-log-btn" class="ri-btn ri-btn-primary" style="width: 100%;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Log Candidate
          </button>
          
          <div id="ri-status" class="ri-status"></div>
        </div>
      `);

      const searchEl = document.getElementById("ri-prof-job-search");
      const menu = document.getElementById("ri-prof-job-menu");
      const idInput = document.getElementById("ri-prof-job-id");

      const renderDropdown = (query) => {
        menu.innerHTML = "";
        let filtered = allJobs;
        if (query) {
          const q = query.toLowerCase();
          filtered = allJobs.filter(j => {
            const comp = j.company_name || "";
            const role = j.role_title || "";
            return comp.toLowerCase().includes(q) || role.toLowerCase().includes(q);
          });
        }
        
        filtered.forEach(job => {
          const div = document.createElement("div");
          div.className = "ri-dropdown-item";
          const dateStr = new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          div.innerHTML = `
            <span class="ri-dropdown-item-title">${job.company_name || 'Unknown'} - ${job.role_title || 'Unknown'}</span>
            <span class="ri-dropdown-item-date">${dateStr}</span>
          `;
          div.addEventListener("mousedown", () => {
            let idEl = document.getElementById("ri-prof-job-id");
            let searchEl = document.getElementById("ri-prof-job-search");
            if (idEl) idEl.value = job.id;
            if (searchEl) searchEl.value = `${job.company_name || 'Unknown'} - ${job.role_title || 'Unknown'}`;
            if (menu) menu.classList.remove("open");
          });
          menu.appendChild(div);
        });
      };

      if (allJobs.length > 0) {
        const latestJob = allJobs[0];
        if (idInput) idInput.value = latestJob.id;
        if (searchEl) searchEl.value = `${latestJob.company_name || 'Unknown'} - ${latestJob.role_title || 'Unknown'}`;
      }

      renderDropdown("");

      if (searchEl) {
        searchEl.addEventListener("focus", () => {
          renderDropdown(searchEl.value);
          menu.classList.add("open");
        });

        searchEl.addEventListener("input", (e) => {
          renderDropdown(e.target.value);
          menu.classList.add("open");
        });

        document.addEventListener("click", (e) => {
          const dropdown = document.getElementById("ri-prof-job-dropdown");
          if (dropdown && !dropdown.contains(e.target)) {
            menu.classList.remove("open");
          }
        });
      }

      const btn = document.getElementById("ri-prof-log-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          const status = document.getElementById("ri-status");
          const job_id = parseInt(document.getElementById("ri-prof-job-id").value);
          const final_name = document.getElementById("ri-prof-name").value.trim();
          const final_role = document.getElementById("ri-prof-role").value.trim();
          const final_company = document.getElementById("ri-prof-company").value.trim();
          const current_url = window.location.href.split('?')[0];
          
          if (isNaN(job_id) || job_id === 0) {
            status.innerText = "Please select a valid role from the dropdown.";
            status.className = "ri-status ri-error";
            return;
          }
          if (!final_name) {
            status.innerText = "Candidate Name is required.";
            status.className = "ri-status ri-error";
            return;
          }

          btn.disabled = true;
          status.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Logging candidate...`;
          status.className = "ri-status ri-loading";

          chrome.runtime.sendMessage({ 
            type: "LOG_OUTREACH", 
            payload: { 
              job_posting_id: job_id, 
              linkedin_url: current_url, 
              profile_name: final_name,
              current_company: final_company,
              current_role: final_role
            } 
          }, (res) => {
            if (chrome.runtime.lastError) {
              btn.disabled = false;
              status.innerText = "Extension error. Please refresh.";
              status.className = "ri-status ri-error";
              return;
            }
            btn.disabled = false;
            if (res && res.success) {
              status.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Candidate Tracked`;
              status.className = "ri-status ri-success";
              setTimeout(() => { window.renderProfileContext(document.getElementById("ri-panel")); }, 1000);
            } else {
              status.innerText = res ? res.error : "Network error";
              status.className = "ri-status ri-error";
            }
          });
        });
      }
    });
  });
}

window.renderProfileContext = renderProfileContext;
