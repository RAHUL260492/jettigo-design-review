/* Where live mode (?live=1) sends API requests. Update apiBase after deploying the API. */
window.JETTIGO_CONFIG = {
  apiBase: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:8787" : "https://jettigo-api.onrender.com",
};
