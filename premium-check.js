// ==================== PREMIUM GATEKEEPER ====================
// This script protects pages from unauthorized direct access.
// Include it on every page that should be premium-only.

(function() {
  const PREMIUM_KEY = 'hsk_premium_active';
  
  // Check if user is premium
  if (localStorage.getItem(PREMIUM_KEY) !== 'true') {
    // Not premium → redirect to index.html (the payment gate)
    // Get the current path to build the correct redirect
    const path = window.location.pathname;
    const redirectUrl = path.substring(0, path.lastIndexOf('/') + 1) + 'index.html';
    window.location.href = redirectUrl;
  }
})();
