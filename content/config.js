// config.js

// Change this to "development" for local testing, or "production" for live
const RI_ENV = "production"; 

const RI_CONFIG = {
  development: {
    API_BASE: "http://localhost:8080/api/v1",
    FRONTEND_URL: "http://localhost:5173/"
  },
  production: {
    API_BASE: "https://recruiter.orbitaryai.com/api/v1",
    FRONTEND_URL: "https://recruiter.orbitaryai.com/"
  }
};

const getConfig = () => RI_CONFIG[RI_ENV];

// Support for both service worker and content script contexts
if (typeof self !== "undefined") {
  self.RI_ENV_CONFIG = getConfig();
}
if (typeof window !== "undefined") {
  window.RI_ENV_CONFIG = getConfig();
}
