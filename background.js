const API_BASE = "http://localhost:8080/api/v1";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_PROFILE_REFERRALS") {
    const url = encodeURIComponent(request.payload.url || "");
    fetch(`${API_BASE}/crm/profile-referrals?url=${url}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data: data.referrals || [] }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "UPDATE_CONNECTION_STATUS") {
    fetch(`${API_BASE}/crm/profile/connection-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "FETCH_DASHBOARD") {
    fetch(`${API_BASE}/crm/dashboard`, { credentials: "include" })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data: data.referrals }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "FETCH_JOBS") {
    const payload = request.payload || {};
    let url = `${API_BASE}/crm/jobs`;
    const params = new URLSearchParams();
    if (payload.q) params.append("q", payload.q);
    if (payload.limit) params.append("limit", payload.limit);
    if (params.toString()) url += "?" + params.toString();

    fetch(url, { credentials: "include" })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data: data.job_postings }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "LOG_OUTREACH") {
    fetch(`${API_BASE}/crm/outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "UPDATE_REFERRAL_STATUS") {
    fetch(`${API_BASE}/crm/outreach/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "BATCH_UPDATE") {
    fetch(`${API_BASE}/crm/outreach/batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "CREATE_JOB") {
    fetch(`${API_BASE}/crm/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
