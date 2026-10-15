/* Páginas individuais de ferramentas — comportamento compartilhado (15/10/2026).
   As contas continuam no <script> de cada página, intactas: elas montam o HTML
   do resultado e chamam openResultModal(html). Aqui essa função passa a
   desenhar o resultado no painel da própria página (sem modal), sem perder
   nenhuma informação do HTML recebido.
   Também cuida de: erro ao lado do campo (preservando o que foi digitado),
   Enter para calcular, aviso de "recalcule" quando um campo muda, memória de
   cálculo, anúncio acessível e rolagem até o resultado no celular.
   Precisa vir depois de main.js (que define o openResultModal antigo). */
(function () {
  const card = document.querySelector('[data-fx-form]');
  const painel = document.getElementById('fx-resultado');
  if (!card || !painel) return;

  const botao = card.querySelector('[data-fx-calcular]');
  const todos = [...card.querySelectorAll('input, select')];
  // Campos escondidos (ex.: RAT/terceiros fora do regime em que valem) não contam.
  const ativos = () => todos.filter(el => !el.disabled && !el.closest('[hidden]'));
  const erroGeral = card.querySelector('[data-fx-erro]');
  const anuncio = document.getElementById('fx-anuncio');
  const nomeBotao = botao.textContent.trim();
  let temResultado = false;

  // ---------- medição (GTM / dataLayer) ----------
  // Só nome da ferramenta, caminho e tipo de erro. Nunca valores digitados nem dados pessoais.
  const calculadora = card.dataset.fxNome || '';
  function evento(nome, extra) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: nome, calculator_name: calculadora, page_path: location.pathname }, extra || {}));
  }
  let iniciou = false;
  const marcarInicio = () => { if (!iniciou) { iniciou = true; evento('calculator_start'); } };
  card.addEventListener('input', marcarInicio, true);
  card.addEventListener('change', marcarInicio, true);
  painel.addEventListener('click', e => {
    const cta = e.target.closest('[data-fx-cta]');
    if (cta) evento('calculator_cta_click', { cta_location: cta.dataset.fxCta });
  });

  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const rotuloDe = el => (card.querySelector(`label[for="${el.id}"]`)?.textContent || '').trim();

  // ---------- erros por campo ----------
  function erroCampo(el, msg) {
    const box = el.closest('.fx-campo');
    const span = box && box.querySelector('.fx-erro');
    if (!span) return;
    box.classList.toggle('tem-erro', Boolean(msg));
    span.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function validar() {
    let primeiro = null;
    todos.forEach(el => { if (!ativos().includes(el)) erroCampo(el, ''); });
    for (const el of ativos()) {
      const v = el.value.trim();
      let msg = '';
      if (!v) msg = el.tagName === 'SELECT' ? 'Escolha uma opção.' : 'Preencha este campo.';
      else if (el.type === 'number') {
        const n = Number(v);
        const min = el.min !== '' ? Number(el.min) : null;
        const max = el.max !== '' ? Number(el.max) : null;
        if (!Number.isFinite(n)) msg = 'Digite um número válido.';
        else if (el.dataset.positivo !== undefined && n <= 0) msg = 'Use um valor maior que zero.';
        else if (min != null && n < min) msg = min === 0 ? 'Use um valor igual ou maior que zero.' : `Use um valor a partir de ${num(min)}.`;
        else if (max != null && n > max) msg = `Use um valor até ${num(max)}.`;
      }
      erroCampo(el, msg);
      if (msg && !primeiro) primeiro = el;
    }
    return primeiro;
  }
  function mostrarErroGeral(texto) {
    erroGeral.textContent = texto || '';
    erroGeral.hidden = !texto;
  }

  // Valida antes do cálculo da página (captura no card roda antes do clique no botão).
  card.addEventListener('click', e => {
    if (!e.target.closest('[data-fx-calcular]')) return;
    mostrarErroGeral('');
    const invalido = validar();
    if (invalido) {
      evento('calculator_error', { error_type: invalido.value.trim() === '' ? 'campo_vazio' : 'valor_fora_da_faixa' });
      e.stopPropagation();
      e.preventDefault();
      invalido.focus();
      anunciar('Revise os campos destacados para calcular.');
    }
  }, true);

  // Enter calcula
  card.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input, select')) return;
    e.preventDefault();
    botao.click();
  });

  // Campo alterado: limpa o erro dele e avisa que o resultado ficou desatualizado
  todos.forEach(el => ['input', 'change'].forEach(tipo => el.addEventListener(tipo, () => {
    if (el.closest('.fx-campo')?.classList.contains('tem-erro') && el.value.trim()) erroCampo(el, '');
    if (temResultado && !painel.classList.contains('desatualizado')) {
      painel.classList.add('desatualizado');
      const aviso = painel.querySelector('[data-fx-aviso]');
      if (aviso) aviso.hidden = false;
    }
  })));

  function anunciar(texto) {
    if (!anuncio) return;
    anuncio.textContent = '';
    setTimeout(() => { anuncio.textContent = texto; }, 60);
  }

  // ---------- memória de cálculo ----------
  function valorExibido(el) {
    if (el.tagName === 'SELECT') return el.options[el.selectedIndex]?.text || '—';
    const wrap = el.closest('.fx-input');
    const pre = wrap?.querySelector('.fx-prefixo')?.textContent.trim();
    const suf = wrap?.querySelector('.fx-sufixo')?.textContent.trim();
    const v = el.value === '' ? '—' : num(el.value);
    return [pre, v, suf].filter(Boolean).join(' ');
  }
  function memoria() {
    const formula = card.dataset.fxFormula || '';
    return `<details class="fx-memoria">
      <summary>Ver memória de cálculo</summary>
      <div class="fx-memoria-corpo">
        <h4>Dados informados</h4>
        <dl>${ativos().map(el => `<div><dt>${esc(rotuloDe(el))}</dt><dd>${esc(valorExibido(el))}</dd></div>`).join('')}</dl>
        ${formula ? `<h4>Como foi calculado</h4><p class="fx-formula">${formula.split('|').map(esc).join('<br>')}</p>` : ''}
      </div>
    </details>`;
  }

  // ---------- leitura do HTML que a página monta ----------
  const GENERICA = /quer entender o que fazer com esse número/i;
  function lerGenerico(d) {
    const linhas = [...d.querySelectorAll('.result-row')].map(r => {
      const v = r.querySelector('.result-val');
      return { rot: r.querySelector('.result-label')?.textContent.trim(), val: v?.textContent.trim(), sec: v?.classList.contains('sec'), neg: v?.classList.contains('neg') };
    });
    const principal = linhas.find(l => !l.sec) || linhas[0];
    return {
      principal,
      blocos: linhas.filter(l => l !== principal),
      notas: [...d.querySelectorAll('.result-note')].map(p => p.innerHTML),
      leitura: [...d.querySelectorAll('.result-modal-message')].map(p => p.textContent.trim()).filter(t => !GENERICA.test(t)),
    };
  }
  // Reforma Tributária: impacto mensal é o principal; os dois sistemas viram blocos.
  function lerReforma(d) {
    const delta = d.querySelector('.result-delta');
    return {
      principal: { rot: `Impacto estimado por mês · ${delta.querySelector('.result-delta-label').textContent.trim()}`, val: delta.querySelector('.result-delta-val').textContent.trim() },
      blocos: [...d.querySelectorAll('.result-col')].map(c => ({
        rot: c.querySelector('.result-col-label').textContent.trim(),
        val: c.querySelector('.result-col-val').textContent.trim(),
        sub: c.querySelector('.result-col-sub').innerHTML,
      })),
      selo: d.querySelector('.nano-badge')?.textContent.trim(),
      notas: [],
      leitura: [...d.querySelectorAll('.result-modal-message')].map(p => p.textContent.trim()),
      premissas: d.querySelector('.result-disclaimer')?.innerHTML,
    };
  }

  // ---------- painel ----------
  window.openResultModal = html => {
    const d = document.createElement('div');
    d.innerHTML = html;
    // A página recusou os dados (ex.: percentuais que somam 100%): erro perto do botão.
    if (d.querySelector('.result-placeholder') && !d.querySelector('.result-row, .result-col')) {
      evento('calculator_error', { error_type: 'regra_da_ferramenta' });
      mostrarErroGeral(d.querySelector('.result-placeholder').textContent.trim());
      anunciar(erroGeral.textContent);
      return;
    }
    mostrarErroGeral('');
    // Cenário que a ferramenta não calcula (ex.: Simples na Reforma): explica, sem número.
    const bloqueio = d.querySelector('.result-bloqueio');
    if (bloqueio) {
      painel.innerHTML = `
        <div class="fx-res-topo"><span class="fx-res-rot">Estimativa indisponível</span></div>
        <p class="fx-aviso" data-fx-aviso hidden>Você alterou os dados. Clique em “${esc(nomeBotao)}” para atualizar.</p>
        <div class="fx-res-conteudo fx-bloqueio">${bloqueio.innerHTML}</div>
        <div class="fx-proximo">
          <p>Quer simular o seu caso com quem entende do assunto?</p>
          <a href="index.html#contato" class="btn btn-primary fx-btn-cta" data-fx-cta="painel_resultado">Quero a Lucri na minha empresa</a>
        </div>`;
      painel.classList.remove('desatualizado', 'vazio');
      temResultado = true;
      evento('calculator_error', { error_type: 'cenario_nao_suportado' });
      anunciar('Estimativa indisponível para esse cenário. ' + bloqueio.textContent.trim().slice(0, 160));
      return;
    }
    const r = d.querySelector('.result-cols') ? lerReforma(d) : lerGenerico(d);
    const p = r.principal || {};
    painel.innerHTML = `
      <div class="fx-res-topo"><span class="fx-res-rot">Seu resultado</span></div>
      <p class="fx-aviso" data-fx-aviso hidden>Você alterou os dados. Clique em “${esc(nomeBotao)}” para atualizar o resultado.</p>
      <div class="fx-res-conteudo">
        ${r.selo ? `<p class="fx-selo-info">${esc(r.selo)}</p>` : ''}
        <p class="fx-principal-rot">${esc(p.rot)}</p>
        <p class="fx-principal-val${p.neg ? ' neg' : ''}">${esc(p.val)}</p>
        ${r.blocos.length ? `<div class="fx-blocos">${r.blocos.map(b => `<div class="fx-bloco"><span>${esc(b.rot)}</span><b class="${b.neg ? 'neg' : ''}">${esc(b.val)}</b>${b.sub ? `<small>${b.sub}</small>` : ''}</div>`).join('')}</div>` : ''}
        ${r.notas.length || r.leitura.length ? `<div class="fx-leitura"><h3>Como ler este resultado</h3>${r.notas.map(n => `<div class="fx-leitura-item">${n}</div>`).join('')}${r.leitura.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
        ${r.premissas ? `<details class="fx-memoria"><summary>Premissas da simulação</summary><div class="fx-memoria-corpo"><p>${r.premissas}</p></div></details>` : ''}
        ${memoria()}
      </div>
      <div class="fx-proximo">
        <p>Quer transformar esses números em decisões para sua empresa?</p>
        <a href="index.html#contato" class="btn btn-primary fx-btn-cta" data-fx-cta="painel_resultado">Quero a Lucri na minha empresa</a>
      </div>`;
    painel.classList.remove('desatualizado', 'vazio');
    temResultado = true;
    evento('calculator_submit');
    anunciar(`Resultado atualizado. ${p.rot}: ${p.val}.`);
    // No celular o painel fica abaixo do formulário: traz o resultado para a tela.
    const topo = painel.getBoundingClientRect().top;
    if (topo > window.innerHeight * 0.6 || topo < 0) {
      const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      painel.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
    }
  };
})();
