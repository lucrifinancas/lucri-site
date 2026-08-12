/* ── Rastreamento de UTM ──────────────────────────────
   Captura utm_source/medium/campaign/term/content da URL,
   guarda no navegador (persiste entre páginas) e:
   1. marca como tag no Clarity (pra filtrar gravações por campanha)
   2. fica disponível pra outros scripts (ex: anexar no WhatsApp)
   ────────────────────────────────────────────────────── */
(function () {
  const STORAGE_KEY = 'lucri_utm';
  const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  function getStoredUtm() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function storeUtm(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  const params = new URLSearchParams(window.location.search);
  const fromUrl = {};
  UTM_FIELDS.forEach((field) => {
    const value = params.get(field);
    if (value) fromUrl[field] = value;
  });

  // Primeiro toque (first-touch): só grava se ainda não tiver UTM salvo,
  // ou se a URL atual trouxer um novo utm_source (nova campanha).
  const stored = getStoredUtm();
  let current = stored;

  if (Object.keys(fromUrl).length && (!stored.utm_source || fromUrl.utm_source)) {
    current = {
      ...fromUrl,
      first_landing_page: stored.first_landing_page || window.location.pathname,
      captured_at: stored.captured_at || new Date().toISOString(),
    };
    storeUtm(current);
  }

  // Expõe globalmente pra outros scripts (ex: js/main.js no envio do form)
  window.lucriUtm = current;

  // Marca como tag no Clarity, se o Clarity já tiver carregado
  if (Object.keys(current).length) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    UTM_FIELDS.forEach((field) => {
      if (current[field]) window.clarity('set', field, current[field]);
    });
  }
})();
