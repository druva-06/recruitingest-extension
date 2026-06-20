// context_jobs.js
function renderJobContext(panel) {
  let title = "";
  let company = "";

  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let script of scripts) {
    try {
      const data = JSON.parse(script.innerText);
      if (data["@type"] === "JobPosting") {
        title = data.title;
        company = data.hiringOrganization?.name;
      } else if (data["@graph"]) {
        const jobNode = data["@graph"].find(n => n["@type"] === "JobPosting");
        if (jobNode) {
          title = jobNode.title;
          company = jobNode.hiringOrganization?.name;
        }
      }
    } catch (e) {}
  }

  if (!title || !company) {
    const docTitle = document.title;
    if (docTitle.includes("hiring")) {
      company = docTitle.split(" hiring ")[0].trim();
      title = docTitle.split(" hiring ")[1].split(" in ")[0].trim();
    } else if (docTitle.includes(" at ")) {
      title = docTitle.split(" at ")[0].trim();
      company = docTitle.split(" at ")[1].split(" | ")[0].trim();
    }
  }

  if (!title || !company) {
    const getText = (s) => (document.querySelector(s)?.innerText || "").trim();
    title = title || getText('h1');
    company = company || getText('.job-details-jobs-unified-top-card__company-name a') 
                      || getText('.job-details-jobs-unified-top-card__primary-description-container a')
                      || getText('.app-aware-link');
  }

  title = title ? String(title) : "";
  company = company ? String(company) : "";

  if (title.toLowerCase().includes("jobs") || title.toLowerCase().includes("search")) title = ""; 

  let jobUrl = window.location.href.split('?')[0];
  if (window.location.search.includes('currentJobId=')) {
    const jobIdMatch = window.location.search.match(/currentJobId=(\d+)/);
    if (jobIdMatch) jobUrl = `https://www.linkedin.com/jobs/view/${jobIdMatch[1]}/`;
  }

  panel.innerHTML = window.getPanelShell(`
    <div style="padding: 4px 0;">
      <!-- Skeleton Header -->
      <div class="ri-skeleton" style="height: 24px; width: 50%; margin-bottom: 8px; border-radius: 6px;"></div>
      <div class="ri-skeleton" style="height: 16px; width: 85%; margin-bottom: 24px; border-radius: 4px;"></div>
      
      <!-- Skeleton Grid (Mimics stats) -->
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div>
          <div class="ri-skeleton" style="height: 12px; width: 45px; margin-bottom: 8px;"></div>
          <div class="ri-skeleton" style="height: 24px; width: 20px;"></div>
        </div>
        <div>
          <div class="ri-skeleton" style="height: 12px; width: 55px; margin-bottom: 8px;"></div>
          <div class="ri-skeleton" style="height: 24px; width: 20px;"></div>
        </div>
        <div>
          <div class="ri-skeleton" style="height: 12px; width: 60px; margin-bottom: 8px;"></div>
          <div class="ri-skeleton" style="height: 24px; width: 20px;"></div>
        </div>
        <div>
          <div class="ri-skeleton" style="height: 12px; width: 55px; margin-bottom: 8px;"></div>
          <div class="ri-skeleton" style="height: 24px; width: 20px;"></div>
        </div>
      </div>

      <!-- Skeleton Button -->
      <div class="ri-skeleton" style="height: 44px; width: 100%; border-radius: 6px;"></div>
    </div>
  `);

  window.riSend({ type: "FETCH_DASHBOARD" }, (res, fetchErr) => {
    if (fetchErr) {
      panel.innerHTML = window.getPanelShell(`
        <div style="padding:20px 0;text-align:center;">
          <div style="font-size:28px;margin-bottom:12px;">&#x1F504;</div>
          <div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">Extension Reconnecting</div>
          <div style="font-size:13px;color:var(--muted);">Please <strong>refresh this page</strong> to reconnect.</div>
        </div>
      `);
      return;
    }
    let existingJob = null;
    let jobStats = { logged: 0, accepted: 0, messaged: 0, referred: 0 };

    if (res && res.success && res.data) {
      const jobsMap = new Map();
      res.data.forEach(r => {
        if (!jobsMap.has(r.job_posting_id)) {
          jobsMap.set(r.job_posting_id, {
            id: r.job_posting_id,
            company_name: r.company_name,
            role_title: r.role_title,
            job_url: r.job_url || '',
            referrals: []
          });
        }
        if (r.referral_id && r.referral_id !== 0 && r.profile_name) {
          jobsMap.get(r.job_posting_id).referrals.push(r);
        }
      });
      
      const allJobs = Array.from(jobsMap.values());
      
      existingJob = allJobs.find(j => {
        const u1 = (j.job_url || "").split('?')[0].replace(/\/$/, "");
        const u2 = (jobUrl || "").split('?')[0].replace(/\/$/, "");
        if (u1 && u2 && u1 === u2) return true;
        if (j.company_name && company && j.role_title && title && 
            j.company_name.toLowerCase() === company.toLowerCase() && 
            j.role_title.toLowerCase() === title.toLowerCase()) return true;
        return false;
      });

      if (existingJob) {
        jobStats.logged = existingJob.referrals.length;
        // connected = profiles where connection_status is Connected
        jobStats.accepted = existingJob.referrals.filter(r => r.connection_status === 'Connected').length;
        jobStats.messaged = existingJob.referrals.filter(r => ['Messaged', 'Referred'].includes(r.status)).length;
        jobStats.referred = existingJob.referrals.filter(r => r.status === 'Referred').length;
      }
    }

    if (existingJob) {
      panel.innerHTML = window.getPanelShell(`
        <div class="ri-title-context" style="color: var(--green); display: flex; alignItems: center; gap: 6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Tracking Active
        </div>
        <div class="ri-subtitle" style="margin-bottom: 20px;"><strong>${existingJob.role_title}</strong> at <strong>${existingJob.company_name}</strong> is in your CRM.</div>
        
        <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; letter-spacing: 0.05em;">Logged</span>
            <span style="font-size: 20px; font-weight: 700; color: var(--ink);">${jobStats.logged}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; letter-spacing: 0.05em;">Connected</span>
            <span style="font-size: 20px; font-weight: 700; color: var(--ink);">${jobStats.accepted}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; letter-spacing: 0.05em;">Messaged</span>
            <span style="font-size: 20px; font-weight: 700; color: var(--ink);">${jobStats.messaged}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; letter-spacing: 0.05em;">Referred</span>
            <span style="font-size: 20px; font-weight: 700; color: ${jobStats.referred > 0 ? 'var(--green)' : 'var(--ink)'};">${jobStats.referred}</span>
          </div>
        </div>

        <a href="http://localhost:5173/#linkedin_crm" target="_blank" class="ri-btn" style="text-align: center; text-decoration: none; display: block; background: #fff; color: var(--ink); border: 1px solid var(--line);">
          Open CRM Dashboard ↗
        </a>
      `);
    } else {
      panel.innerHTML = window.getPanelShell(`
        <div class="ri-title-context">Sync Job</div>
        <div class="ri-subtitle">Add this position to your tracking pipeline.</div>
        
        <div class="ri-form-group">
          <label class="ri-label">Company Name</label>
          <input id="ri-job-company" class="ri-input" placeholder="e.g. Acme Corp" value="${company}" autocomplete="off" />
        </div>
        
        <div class="ri-form-group">
          <label class="ri-label">Role Title</label>
          <input id="ri-job-role" class="ri-input" placeholder="e.g. Senior Engineer" value="${title}" autocomplete="off" />
        </div>
        
        <div class="ri-form-group">
          <label class="ri-label">Job Link</label>
          <input id="ri-job-url" class="ri-input" placeholder="https://..." value="${jobUrl}" autocomplete="off" />
        </div>

        <button id="ri-job-btn" class="ri-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Save to Pipeline
        </button>
        <div id="ri-status" class="ri-status"></div>
      `);

      const btn    = panel.querySelector("#ri-job-btn");
      const status  = panel.querySelector("#ri-status");
      const compEl  = panel.querySelector("#ri-job-company");
      const roleEl  = panel.querySelector("#ri-job-role");
      const urlEl   = panel.querySelector("#ri-job-url");

      if (btn) btn.addEventListener("click", () => {
        const comp   = compEl ? compEl.value.trim() : "";
        const role   = roleEl ? roleEl.value.trim() : "";
        const urlVal = urlEl  ? urlEl.value.trim()  : "";

        if (!comp || !role) {
          if (status) { status.innerText = "Company and Role are required."; status.className = "ri-status ri-error"; }
          return;
        }

        btn.disabled = true;
        if (status) {
          status.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Saving...`;
          status.className = "ri-status ri-loading";
        }

        window.riSend({ type: "CREATE_JOB", payload: { company_name: comp, role_title: role, job_url: urlVal } }, (res, err) => {
          btn.disabled = false;
          if (!status) return;
          if (err) {
            status.innerText = "Extension error — please refresh the page.";
            status.className = "ri-status ri-error";
            return;
          }
          if (res && res.success) {
            status.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Successfully Saved`;
            status.className = "ri-status ri-success";
            setTimeout(window.closePanel, 2000);
          } else {
            status.innerText = (res && res.error) ? res.error : "Network error";
            status.className = "ri-status ri-error";
          }
        });
      });
    }
  });
}

window.renderJobContext = renderJobContext;
