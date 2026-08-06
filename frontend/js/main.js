/* Lucri — main.js */

/* ── Scroll reveal ─────────────────────────────────── */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.reveal').forEach((el) => {
  const r = el.getBoundingClientRect();
  if (r.top < window.innerHeight && r.bottom > 0) {
    // no viewport: aguarda um frame para o browser pintar o estado inicial
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
  } else {
    observer.observe(el);
  }
});

/* ── Nav: classe scrolled ──────────────────────────── */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ── Nav: active link ──────────────────────────────── */
const sections = document.querySelectorAll('section[id], div[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const activateLink = () => {
  let current = '';
  sections.forEach((s) => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  navLinks.forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
};
window.addEventListener('scroll', activateLink, { passive: true });

/* ── Hamburger menu ────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const drawer    = document.getElementById('drawer');
hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  drawer.classList.toggle('open', open);
});
drawer.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    drawer.classList.remove('open');
  });
});

/* ── FAQ accordion ─────────────────────────────────── */
document.querySelectorAll('.faq-item').forEach((item) => {
  item.querySelector('.faq-trigger').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((o) => o.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ── Modal de resultado (páginas de ferramentas) ───── */
const resultModalOverlay = document.getElementById('result-modal-overlay');
const resultModalBody    = document.getElementById('result-modal-body');
const resultModalClose   = document.getElementById('result-modal-close');

window.openResultModal = (html) => {
  if (!resultModalOverlay || !resultModalBody) return;
  resultModalBody.innerHTML = html;
  resultModalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
};
const closeResultModal = () => {
  resultModalOverlay?.classList.remove('active');
  document.body.style.overflow = '';
};
resultModalClose?.addEventListener('click', closeResultModal);
resultModalOverlay?.addEventListener('click', (e) => { if (e.target === resultModalOverlay) closeResultModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeResultModal(); });

/* ── Formulário → WhatsApp ─────────────────────────── */
const form = document.getElementById('form-contato');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome        = form.nome?.value.trim()      || '';
    const empresa     = form.empresa?.value.trim()   || '';
    const faturamento = form.faturamento?.value      || '';
    const mensagem    = form.mensagem?.value.trim()  || '';

    const texto = [
      `Olá, me chamo *${nome}*`,
      empresa       ? `Empresa: *${empresa}*`           : '',
      faturamento   ? `Faturamento: *${faturamento}*`   : '',
      mensagem      ? `\n${mensagem}`                   : '',
    ].filter(Boolean).join('\n');

    window.open(
      `https://wa.me/5541992423755?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener'
    );
  });
}
