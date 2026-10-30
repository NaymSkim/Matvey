import { topics, symbols, formulas } from './formulas.js';

const byId = new Map(formulas.map(f => [f.id, f]));
const nav = document.querySelector('#formulaNav');
const detail = document.querySelector('#detail');
const search = document.querySelector('#search');
const sidebar = document.querySelector('#sidebar');
const menuToggle = document.querySelector('#menuToggle');
const toast = document.querySelector('#toast');
let activeId = 'f01';
let revealed = 0;
let toastTimer;

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const math = (latex, display = false) => {
  try { return window.katex.renderToString(latex, { throwOnError: true, displayMode: display, output: 'htmlAndMathml' }); }
  catch (error) { console.error('Equation error:', latex, error); return `<code>${esc(latex)}</code>`; }
};
const topicStyle = index => `--topic-color:${topics[index].color};--topic-soft:${topics[index].color}13`;
const number = id => String(Number(id.slice(1))).padStart(2, '0');

function diagram(type, title) {
  const base = `viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема: ${esc(title)}"`;
  const stroke = `stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
  const arrow = `<defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="currentColor"/></marker></defs>`;
  const diagrams = {
    motion:`<path d="M28 125H230" ${stroke} marker-end="url(#arrow)"/><path d="M65 112V137M190 112V137" ${stroke}/><circle cx="65" cy="125" r="9" fill="currentColor"/><circle cx="190" cy="125" r="9" fill="currentColor" opacity=".35"/><path d="M75 83H180" ${stroke} marker-end="url(#arrow)"/><text x="63" y="155">x₀</text><text x="190" y="155">x</text><text x="125" y="72">v</text>`,
    fall:`<path d="M58 25V143M51 143H73" ${stroke}/><circle cx="154" cy="42" r="12" fill="currentColor" opacity=".35"/><circle cx="154" cy="125" r="12" fill="currentColor"/><path d="M154 63V105" ${stroke} marker-end="url(#arrow)"/><path d="M196 42V125" ${stroke} marker-end="url(#arrow)"/><text x="206" y="89">g</text><text x="73" y="92">h</text>`,
    circle:`<circle cx="130" cy="85" r="53" ${stroke}/><circle cx="130" cy="85" r="4" fill="currentColor"/><path d="M130 85L178 63M178 63L203 75" ${stroke} marker-end="url(#arrow)"/><path d="M180 65L153 77" ${stroke} marker-end="url(#arrow)"/><text x="147" y="67">R</text><text x="205" y="67">v</text>`,
    forces:`<rect x="100" y="72" width="60" height="45" rx="7" ${stroke}/><path d="M130 73V33M130 117V151M99 94H52M160 94H208" ${stroke} marker-end="url(#arrow)"/><text x="139" y="41">N</text><text x="139" y="148">mg</text>`,
    spring:`<path d="M36 50V125M36 84h18l10-16 12 32 13-32 13 32 13-32 12 16h18" ${stroke}/><rect x="157" y="65" width="45" height="40" rx="5" ${stroke}/><path d="M220 87H244" ${stroke} marker-end="url(#arrow)"/><text x="214" y="71">x</text>`,
    gravity:`<circle cx="78" cy="85" r="24" ${stroke}/><circle cx="192" cy="85" r="37" ${stroke}/><path d="M105 85H147M166 85H122" ${stroke} marker-end="url(#arrow)"/><text x="69" y="91">m₁</text><text x="183" y="91">m₂</text>`,
    blocks:`<rect x="52" y="66" width="62" height="62" rx="5" ${stroke}/><rect x="141" y="44" width="54" height="84" rx="5" ${stroke}/><path d="M33 128H218" ${stroke}/><text x="68" y="102">m</text><text x="158" y="88">V</text>`,
    pressure:`<rect x="78" y="91" width="105" height="36" rx="4" ${stroke}/><path d="M35 128H224M130 35V77" ${stroke} marker-end="url(#arrow)"/><text x="139" y="57">F⊥</text><text x="128" y="147">S</text>`,
    liquid:`<path d="M52 35V139H209V35M52 59Q80 51 105 59T157 59T209 59" ${stroke}/><rect x="114" y="83" width="39" height="37" rx="4" ${stroke}/><path d="M133 130V94" ${stroke} marker-end="url(#arrow)"/><text x="158" y="111">Fₐ</text><text x="70" y="103">h</text>`,
    lever:`<path d="M30 119H228M130 120L110 147H150Z" ${stroke}/><path d="M70 55V104M190 58V104" ${stroke} marker-end="url(#arrow)"/><text x="55" y="48">F₁</text><text x="180" y="51">F₂</text>`,
    momentum:`<rect x="40" y="70" width="48" height="40" rx="6" ${stroke}/><rect x="174" y="70" width="48" height="40" rx="6" ${stroke}/><path d="M93 90H130M169 90H137" ${stroke} marker-end="url(#arrow)"/><text x="51" y="95">m₁</text><text x="185" y="95">m₂</text>`,
    work:`<path d="M25 129H231" ${stroke}/><rect x="103" y="88" width="52" height="41" rx="5" ${stroke}/><path d="M146 82L197 40M155 108H207" ${stroke} marker-end="url(#arrow)"/><text x="198" y="35">F</text><text x="210" y="112">s</text>`,
    pendulum:`<path d="M50 25H208M130 25L173 126M130 25V128" ${stroke}/><circle cx="173" cy="126" r="13" fill="currentColor" opacity=".55"/><path d="M156 93Q142 96 139 111" ${stroke} marker-end="url(#arrow)"/><text x="148" y="60">l</text><text x="183" y="133">m</text>`,
    wave:`<path d="M20 116H240" ${stroke} marker-end="url(#arrow)"/><path d="M25 86Q50 34 75 86T125 86T175 86T225 86" ${stroke}/><path d="M75 136H175" ${stroke} marker-end="url(#arrow)"/><text x="117" y="155">λ</text><text x="215" y="51">v →</text>`,
    heat:`<rect x="91" y="88" width="82" height="55" rx="7" ${stroke}/><path d="M111 72Q100 59 112 46Q123 33 112 22M132 72Q121 59 133 46Q144 33 133 22M153 72Q142 59 154 46Q165 33 154 22" ${stroke}/><path d="M57 113H82M181 113H205" ${stroke} marker-end="url(#arrow)"/><text x="111" y="122">Q</text>`,
    circuit:`<path d="M43 44H208V130H43V44M43 81H68M43 96H68" ${stroke}/><rect x="110" y="35" width="48" height="18" rx="4" ${stroke}/><circle cx="207" cy="88" r="21" ${stroke}/><text x="128" y="49">R</text><text x="200" y="94">A</text><text x="55" y="32">+</text>`,
    resistor:`<path d="M31 87H80M180 87H230" ${stroke}/><rect x="80" y="63" width="100" height="48" rx="6" ${stroke}/><path d="M96 87H164" ${stroke} marker-end="url(#arrow)"/><text x="125" y="54">R</text><text x="128" y="103">I</text>`,
    branch:`<path d="M38 86H77M77 45V128M77 45H185M77 128H185M185 45V128M185 86H223" ${stroke}/><rect x="113" y="35" width="35" height="20" rx="3" ${stroke}/><rect x="113" y="118" width="35" height="20" rx="3" ${stroke}/><text x="124" y="50">R₁</text><text x="124" y="133">R₂</text>`,
    ray:`<path d="M25 86H234M130 18V152" ${stroke}/><path d="M55 25L130 86L193 137" ${stroke} marker-end="url(#arrow)"/><path d="M100 79Q107 64 117 60M143 96Q151 106 154 117" ${stroke}/><text x="87" y="56">α</text><text x="157" y="109">β</text><text x="205" y="60">n₁</text><text x="205" y="112">n₂</text>`,
    lens:`<path d="M128 25V146M25 88H235" ${stroke}/><path d="M108 35L128 25L148 35M108 136L128 146L148 136" ${stroke}/><path d="M55 88V43M55 43L128 43L194 118M55 43L194 118" ${stroke} marker-end="url(#arrow)"/><circle cx="169" cy="88" r="3" fill="currentColor"/><text x="164" y="108">F</text>`,
    nucleus:`<circle cx="131" cy="85" r="57" ${stroke}/><circle cx="111" cy="67" r="13" fill="currentColor" opacity=".45"/><circle cx="147" cy="64" r="13" fill="currentColor" opacity=".7"/><circle cx="116" cy="101" r="13" fill="currentColor" opacity=".7"/><circle cx="151" cy="105" r="13" fill="currentColor" opacity=".45"/><path d="M186 83H226" ${stroke} marker-end="url(#arrow)"/>`,
    orbit:`<circle cx="127" cy="85" r="54" ${stroke}/><circle cx="127" cy="85" r="15" fill="currentColor" opacity=".5"/><circle cx="181" cy="85" r="6" fill="currentColor"/><path d="M181 77V28" ${stroke} marker-end="url(#arrow)"/><text x="191" y="54">v</text>`,
  };
  return `<div class="diagram-card"><svg ${base}><style>text{fill:currentColor}</style>${arrow}<g font-family="Manrope, sans-serif" font-size="13" font-weight="700" fill="none">${diagrams[type] || diagrams.motion}</g></svg></div>`;
}

function renderNav() {
  const query = search.value.trim().toLocaleLowerCase('ru');
  const matches = formulas.filter(f => [f.title, f.meaning, f.latex, topics[f.topic].name].join(' ').toLocaleLowerCase('ru').includes(query));
  if (!matches.length) { nav.innerHTML = '<div class="empty-search">Ничего не найдено. Попробуй другое слово.</div>'; return; }
  nav.innerHTML = topics.map((topic, index) => {
    const group = matches.filter(f => f.topic === index);
    if (!group.length) return '';
    return `<div class="nav-topic" style="--topic-color:${topic.color}"><button class="nav-topic-title" type="button" data-open="${group[0].id}"><span class="topic-dot"></span>${esc(topic.short)}<span class="count">${group.length}</span></button>${group.map(f => `<button class="nav-item ${f.id === activeId ? 'active' : ''}" type="button" data-open="${f.id}" ${f.id === activeId ? 'aria-current="page"' : ''}><span class="nav-number">${number(f.id)}</span><span>${esc(f.title)}</span></button>`).join('')}</div>`;
  }).join('');
  const active = nav.querySelector('.nav-item.active');
  if (active && !query) sidebar.scrollTop += active.getBoundingClientRect().top - sidebar.getBoundingClientRect().top - sidebar.clientHeight / 2;
}

function renderSteps(f) {
  const list = document.querySelector('#stepList');
  const counter = document.querySelector('#stepCounter');
  if (!list || !counter) return;
  counter.textContent = `${revealed} из ${f.steps.length}`;
  list.innerHTML = revealed ? f.steps.slice(0, revealed).map(([equation, explanation], index) => `<div class="step"><span class="step-index">${index + 1}</span><div class="step-body"><div class="math">${math(equation)}</div><p>${esc(explanation)}</p></div></div>`).join('') : '<div class="step-placeholder">Начни с первого шага и проследи всю цепочку рассуждения.</div>';
  document.querySelector('#prevStep').disabled = revealed === 0;
  const next = document.querySelector('#nextStep');
  next.disabled = revealed === f.steps.length;
  next.textContent = revealed === 0 ? 'Показать шаг 1 →' : revealed === f.steps.length - 1 ? 'Показать итог →' : 'Следующий шаг →';
  document.querySelector('#showAll').disabled = revealed === f.steps.length;
}

function renderDetail() {
  const f = byId.get(activeId) || formulas[0];
  const topic = topics[f.topic];
  document.documentElement.style.setProperty('--accent', topic.color);
  document.documentElement.style.setProperty('--soft', `${topic.color}13`);
  document.title = `${f.title} — Физика по шагам`;
  const index = formulas.indexOf(f);
  detail.innerHTML = `<div class="detail-inner" style="${topicStyle(f.topic)}">
    <div class="breadcrumb"><span>Главная</span><span class="sep">/</span><span>${esc(topic.name)}</span><span class="sep">/</span><span>Формула ${number(f.id)}</span></div>
    <section class="hero" aria-labelledby="formulaTitle"><div><div class="hero-meta"><span class="topic-pill">${esc(topic.name)}</span><span class="formula-count">${number(f.id)} / ${formulas.length}</span></div><h2 id="formulaTitle">${esc(f.title)}</h2><p class="lead">${esc(f.meaning)}</p></div>${diagram(f.diagram, f.title)}</section>
    <section class="equation-card" aria-label="Формула"><div class="micro-label">ФОРМУЛА</div><div class="big-equation">${math(f.latex, true)}</div><div class="equation-foot"><span class="kind-badge">${esc(f.kind)}</span><button class="copy-link" id="copyLink" type="button">↗ Скопировать ссылку</button></div></section>
    <div class="content-grid"><section class="panel steps-panel" aria-labelledby="stepsTitle"><div class="steps-head"><h3 id="stepsTitle">Разбираем по шагам</h3><span class="step-counter" id="stepCounter" aria-live="polite"></span></div><p class="steps-intro">Каждый переход опирается на определение, физический закон или предыдущую формулу.</p><div class="step-list" id="stepList" aria-live="polite"></div><div class="step-actions"><button class="button" id="prevStep" type="button">← Назад</button><button class="button primary" id="nextStep" type="button"></button><button class="button" id="showAll" type="button">Показать всё</button></div></section>
    <div class="info-stack"><section class="panel"><div class="micro-label">КОГДА РАБОТАЕТ</div><h3>Условия применения</h3><p class="assumption">${esc(f.assumptions)}</p></section><section class="panel"><div class="micro-label">ЯЗЫК ФОРМУЛЫ</div><h3>Обозначения</h3><div class="symbols-list">${f.vars.map(key => { const [symbol, description, unit] = symbols[key]; return `<span class="symbol-math">${math(symbol)}</span><span class="symbol-desc">${esc(description)}</span><span class="symbol-unit">${esc(unit)}</span>`; }).join('')}</div></section></div></div>
    <section class="panel example-panel"><div class="micro-label">ПРОВЕРИМ НА ЧИСЛАХ</div><h3>Пример</h3><p>${esc(f.example[0])}</p><div class="math">${math(f.example[1])}</div></section>
    <nav class="bottom-nav" aria-label="Соседние формулы"><a class="bottom-link ${index === 0 ? 'disabled' : ''}" href="#${formulas[Math.max(0,index-1)].id}"><small>← ПРЕДЫДУЩАЯ</small><strong>${esc(formulas[Math.max(0,index-1)].title)}</strong></a><a class="bottom-link ${index === formulas.length-1 ? 'disabled' : ''}" href="#${formulas[Math.min(formulas.length-1,index+1)].id}"><small>СЛЕДУЮЩАЯ →</small><strong>${esc(formulas[Math.min(formulas.length-1,index+1)].title)}</strong></a></nav>
  </div>`;
  renderSteps(f);
  document.querySelector('#prevStep').addEventListener('click', () => { revealed = Math.max(0, revealed - 1); renderSteps(f); });
  document.querySelector('#nextStep').addEventListener('click', () => { revealed = Math.min(f.steps.length, revealed + 1); renderSteps(f); });
  document.querySelector('#showAll').addEventListener('click', () => { revealed = f.steps.length; renderSteps(f); });
  document.querySelector('#copyLink').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); showToast('Ссылка скопирована'); }
    catch { showToast('Ссылка в адресной строке'); }
  });
}

function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2300); }
function openFormula(id, scroll = true) {
  if (!byId.has(id)) id = 'f01';
  activeId = id; revealed = 0;
  renderNav(); renderDetail();
  sidebar.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false');
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}
nav.addEventListener('click', event => {
  const id = event.target.closest('[data-open]')?.dataset.open;
  if (id) location.hash = id;
});
search.addEventListener('input', renderNav);
menuToggle.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
window.addEventListener('hashchange', () => openFormula(location.hash.slice(1)));
openFormula(location.hash.slice(1) || 'f01', false);
