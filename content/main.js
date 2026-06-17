// main.js

// Add a spin animation to the global styles for loaders (since it wasn't strictly in the CSS string before)
const spinnerStyle = document.createElement("style");
spinnerStyle.innerHTML = `@keyframes ri-spin { 100% { transform: rotate(360deg); } } .spin { animation: ri-spin 1s linear infinite; }`;
document.head.appendChild(spinnerStyle);

// Re-render panel automatically if URL changes while open
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (window.isPanelOpen && window.isPanelOpen() && window.renderPanelContext) {
      window.renderPanelContext();
    }
  }
}).observe(document, {subtree: true, childList: true});

// Init
setTimeout(() => {
  if (window.injectFAB) {
    window.injectFAB();
  }
}, 1500);
