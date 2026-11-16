"use strict";

const STORAGE_KEY = "physics-olympiad-impulse-work-v2";
const choice = (label, prompt, options, answer, hint, explain) => ({ label, prompt, options, answer, hint, explain, kind: "choice" });
const number = (label, prompt, answer, unit, hint, explain, tolerance = 0.01) => ({ label, prompt, answer, unit, hint, explain, tolerance, kind: "number" });

const problems = [
  {
    id: "graph",
    short: "Импульс и трение",
    title: "Сила на графике и момент начала движения",
    subtitle: "Отделяем трение покоя от трения скольжения и считаем импульс силы по площади.",
    source: "«Надежда энергетики», 2019, 9 класс · задача 1.21.1",
    prompt: "Тело массой 2 кг сначала покоится на горизонтальной поверхности. Горизонтальная сила F меняется по графику. Через 4 с скорость тела равна 12,5 м/с. Найди коэффициент трения о поверхность. Прими g = 10 м/с².",
    scan: "impulse-work/assets/olympiad-1-21-1.jpg",
    takeaways: ["До начала скольжения приложенная сила уравновешивается трением покоя.", "Площадь под графиком F(t) — импульс силы; учитывать нужно только участок движения.", "Корень уравнения обязательно проверяют по физическому условию."],
    steps: [
      choice("Чтение графика", "На каком участке сила растёт линейно от 0 до 20 Н?", ["От 0 до 2 с", "От 2 до 4 с", "От 4 до 5 с"], 0, "Посмотри на наклонный отрезок в начале графика.", "На отрезке 0–2 с сила растёт: F(t) = 10t Н."),
      choice("Физическая модель", "Что происходит, пока тело ещё не сдвинулось?", ["Сила трения покоя уравновешивает приложенную силу", "Тело сразу разгоняется", "Силы трения нет"], 0, "Пока скорость равна нулю, результирующая горизонтальная сила равна нулю.", "До момента начала скольжения Fтр.пок = F(t), поэтому импульс тела не меняется."),
      choice("Схема сил", "Нарисуй силы на черновике. Какая схема верна?", ["F вправо, трение влево, N вверх, mg вниз", "F и трение вправо, N вниз", "Только F вправо и mg вниз"], 0, "Вертикально действуют тяжесть и реакция опоры.", "Четыре силы: F →, Fтр ←, N ↑, mg ↓. На горизонтальной поверхности N = mg."),
      choice("Дано и искомое", "Какая краткая запись соответствует задаче?", ["m = 2 кг, v₄ = 12,5 м/с, g = 10 м/с²; найти μ", "m = 12,5 кг, v₄ = 2 м/с; найти F", "m = 2 кг, t = 5 с; найти путь"], 0, "В условии спрашивают коэффициент трения.", "Записываем m = 2 кг, v₄ = 12,5 м/с, g = 10 м/с², t = 4 с; найти μ."),
      choice("Единицы и график", "В каких единицах измеряется площадь под графиком F(t)?", ["Н·с, то же что кг·м/с", "Н/с", "Дж"], 0, "Площадь — произведение силы на время.", "Единица импульса силы — Н·с = кг·м/с. Дополнительный перевод в СИ не нужен."),
      number("Первый участок", "Найди площадь треугольника под графиком на отрезке 0–2 с.", 20, "Н·с", "Основание 2 с, высота 20 Н; площадь треугольника — половина произведения.", "J₀₋₂ = 2 · 20 / 2 = 20 Н·с."),
      number("Весь приложенный импульс", "Найди площадь под графиком F(t) от 0 до 4 с.", 60, "Н·с", "К треугольнику добавь прямоугольник шириной 2 с и высотой 20 Н.", "J₀₋₄ = 20 + 2 · 20 = 60 Н·с."),
      choice("Порог скольжения", "Обозначь момент начала скольжения t₀. Какое равенство выполняется в этот момент?", ["F(t₀) = μmg", "F(t₀) = mv₄", "F(t₀) = mg/μ"], 0, "Сравни приложенную силу с предельной силой трения покоя.", "На пороге движения F(t₀) = μN = μmg = 20μ Н."),
      choice("Время старта", "На первом участке F(t) = 10t Н. Чему равно t₀?", ["2μ с", "20μ с", "μ/2 с"], 0, "Реши 10t₀ = 20μ.", "Из 10t₀ = 20μ получаем t₀ = 2μ с. Так как тело движется к 4-й секунде, этот момент лежит на первом участке."),
      number("Изменение импульса", "Чему равен импульс тела в момент t = 4 с?", 25, "кг·м/с", "Начальный импульс нулевой; умножь массу на скорость через 4 с.", "Δp = mv₄ = 2 · 12,5 = 25 кг·м/с."),
      choice("Импульс до старта", "Какую площадь под F(t) нельзя прибавлять к изменению импульса тела?", ["5t₀² Н·с", "10t₀ Н·с", "20t₀ Н·с"], 0, "До t₀ график — треугольник с основанием t₀ и высотой 10t₀.", "До начала скольжения J₀₋ₜ₀ = t₀ · 10t₀ / 2 = 5t₀² Н·с; этот импульс уравновешен трением покоя."),
      choice("Импульс трения", "Каков модуль импульса трения скольжения от t₀ до 4 с?", ["20μ(4 − t₀) Н·с", "20μ · 4 Н·с", "5t₀² Н·с"], 0, "Сила трения скольжения постоянна, а время скольжения равно 4 − t₀.", "Jтр = μmg(4 − t₀) = 20μ(4 − t₀) Н·с."),
      choice("Уравнение", "Подставь t₀ = 2μ в баланс импульсов. Какое квадратное уравнение получается?", ["4μ² − 16μ + 7 = 0", "4μ² + 16μ + 7 = 0", "μ² − 4μ + 7 = 0"], 0, "Начни с 25 = 60 − 5t₀² − 20μ(4 − t₀).", "25 = 60 − 5(2μ)² − 20μ(4 − 2μ) = 60 − 80μ + 20μ². После деления на 5: 4μ² − 16μ + 7 = 0."),
      number("Ответ и отбор корня", "Корни уравнения — 0,5 и 3,5. Введи физически допустимое значение μ.", 0.5, "", "Для μ = 3,5 момент t₀ = 7 с: тело не могло разогнаться к 4-й секунде.", "μ = 0,5. Тогда t₀ = 1 с, что согласуется с графиком и ненулевой скоростью через 4 с. Корень 3,5 отвергаем.")
    ]
  },
  {
    id: "rope",
    short: "Работа и канат",
    title: "Канат на наклонной плоскости",
    subtitle: "Разделяем изменение потенциальной энергии и трение на двух участках пути.",
    source: "Олимпиада КФУ, 2019, 9 класс · задача 1.23.1",
    prompt: "Канат массой m и длиной L лежит на наклонной плоскости от C до A. Его верхний конец медленно перемещают в B через O. AO = OB = 1,5L. Коэффициент трения на обеих поверхностях одинаков и равен μ < 1, угол наклона равен α. Найди минимальную работу приложенной силы. Закругление в O пренебрежимо мало по сравнению с L.",
    scan: "impulse-work/assets/olympiad-1-23-1.jpg",
    takeaways: ["Минимум работы достигается при медленном перемещении: прирост кинетической энергии стремится к нулю.", "Вклад силы тяжести считают по подъёму центра масс.", "Трение на наклонном и горизонтальном участках нужно складывать отдельно."],
    steps: [
      choice("Геометрия", "Где канат находится в начале и в конце?", ["Сначала целиком на склоне, затем целиком на горизонтали", "Сначала на горизонтали, затем на склоне", "В конце половина каната остаётся на склоне"], 0, "Начальный участок CA длиной L заканчивается в A; конечное положение верхнего конца — B.", "Вначале канат целиком лежит на наклонной плоскости, в конце целиком на горизонтальной."),
      choice("Схема", "Нарисуй на черновике O, A, B, C и оба положения каната. Какие расстояния верны?", ["AO = OB = 1,5L, а AC = L", "AO = OB = 0,5L, а AC = L", "AO = L, а AC = 1,5L"], 0, "Расстояния AO и OB прямо указаны в условии.", "AO = OB = 1,5L. Начальный канат занимает на склоне от 0,5L до 1,5L от O."),
      choice("Условие минимума", "Почему можно не учитывать прирост кинетической энергии?", ["Канат перемещают сколь угодно медленно", "Канат не имеет массы", "Сила трения равна нулю"], 0, "В условии сказано, что конец перемещают медленно.", "При квазистатическом перемещении ΔK можно сделать сколь угодно малым; работа идёт на подъём и преодоление трения."),
      choice("Что найти", "Какие три вклада нужно сложить?", ["Подъём центра масс, трение на склоне, трение на горизонтали", "Подъём и только горизонтальное трение", "Только трение на склоне"], 0, "Канат соприкасается с двумя поверхностями.", "Amin = ΔEп + Aтр,склон + Aтр,горизонталь."),
      choice("Центр масс в начале", "Как далеко от O находится центр масс каната в начальном положении вдоль склона?", ["На расстоянии L", "На расстоянии 0,5L", "На расстоянии 1,5L"], 0, "Канат занимает промежуток от 0,5L до 1,5L.", "Середина отрезка [0,5L; 1,5L] находится на расстоянии L от O."),
      choice("Центр масс в конце", "Как далеко от O находится центр масс каната в конечном положении по горизонтали?", ["На расстоянии L", "На расстоянии 0,5L", "На расстоянии 1,5L"], 0, "Конечный канат занимает промежуток от 0,5L до 1,5L слева от O.", "В конце центр масс тоже удалён от O на L, но уже по горизонтали."),
      choice("Подъём", "На какую высоту поднялся центр масс?", ["L sin α", "L cos α", "1,5L sin α"], 0, "Начальная вертикальная глубина — проекция расстояния L вдоль склона.", "Центр масс поднялся на h = L sin α."),
      choice("Работа против тяжести", "Чему равен вклад силы тяжести в минимальную работу приложенной силы?", ["mgL sin α", "mgL cos α", "μmgL"], 0, "Умножь вес каната на подъём центра масс.", "ΔEп = mgh = mgL sin α."),
      choice("Нормальная реакция", "Для малого элемента каната массой dm на склоне чему равна нормальная реакция?", ["dm · g cos α", "dm · g sin α", "dm · g"], 0, "Нужна составляющая веса перпендикулярно склону.", "dN = dm · g cos α, поэтому dFтр = μdm · g cos α."),
      choice("Путь по склону", "Каков средний путь каждого элемента каната по склону до O?", ["L", "0,5L", "1,5L"], 0, "Начальные расстояния элементов от O равномерно заполняют [0,5L; 1,5L].", "Среднее расстояние до O равно L."),
      choice("Трение на склоне", "Какой вклад в работу даёт трение на наклонном участке?", ["μmgL cos α", "μmgL sin α", "mgL cos α"], 0, "Суммарная работа — сила трения для каждой части умноженная на её путь; средний путь равен L.", "Aтр,склон = μmg cos α · L = μmgL cos α."),
      choice("Путь по горизонтали", "Каков средний путь каждого элемента каната от O до конечного положения?", ["L", "0,5L", "1,5L"], 0, "Конечные расстояния элементов от O заполняют тот же промежуток [0,5L; 1,5L].", "Средний горизонтальный путь элемента равен L."),
      choice("Трение на горизонтали", "Какой вклад даёт трение на горизонтальном участке?", ["μmgL", "μmgL cos α", "mgL sin α"], 0, "На горизонтали нормальная реакция на элемент равна dm · g.", "Aтр,горизонталь = μmg · L = μmgL."),
      choice("Итог и проверка", "Сложи три вклада. Какая формула даёт минимальную работу?", ["mgL[sin α + μ(cos α + 1)]", "mgL[cos α + μ(sin α + 1)]", "mgL(sin α + μ cos α)"], 0, "Сложи mgL sin α, μmgL cos α и μmgL.", "Amin = mgL[sin α + μ(cos α + 1)]. При μ = 0 остаётся только подъём; при α = 0 получается 2μmgL, как и должно быть для пути 2L по горизонтали.")
    ]
  }
];

const totalSteps = problems.reduce((sum, problem) => sum + problem.steps.length, 0);
const workspace = document.getElementById("workspace");
const nav = document.getElementById("module-nav");

function emptyState() {
  return { version: 1, selected: problems[0].id, progress: Object.fromEntries(problems.map((problem) => [problem.id, { index: 0, statuses: [] }])) };
}

function loadState() {
  const fallback = emptyState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.version !== 1) return fallback;
    if (problems.some((problem) => problem.id === saved.selected)) fallback.selected = saved.selected;
    for (const problem of problems) {
      const raw = saved.progress?.[problem.id];
      if (!Array.isArray(raw?.statuses)) continue;
      const statuses = raw.statuses.slice(0, problem.steps.length).filter((status) => status === "self" || status === "assisted");
      fallback.progress[problem.id] = { statuses, index: Math.min(Math.max(0, Number(raw.index) || 0), statuses.length) };
    }
  } catch { /* A damaged saved state starts a fresh route. */ }
  return fallback;
}

let state = loadState();
let wrongAttempts = 0;

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* The route remains usable without storage. */ }
}

function currentProblem() { return problems.find((problem) => problem.id === state.selected) || problems[0]; }
function currentRun() { return state.progress[currentProblem().id]; }
function completedCount() { return problems.reduce((sum, problem) => sum + state.progress[problem.id].statuses.length, 0); }

function renderNav() {
  nav.replaceChildren();
  problems.forEach((problem, index) => {
    const done = state.progress[problem.id].statuses.length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `module-link${problem.id === state.selected ? " active" : ""}`;
    button.dataset.problem = problem.id;
    button.setAttribute("aria-current", problem.id === state.selected ? "step" : "false");
    button.innerHTML = `<span class="module-num">${index + 1}</span><span>${problem.short}</span><span class="module-count">${done}/${problem.steps.length}</span>`;
    nav.append(button);
  });
}

function renderProgress() {
  const done = completedCount();
  const percent = Math.round(done / totalSteps * 100);
  document.getElementById("progress-text").textContent = `${done} из ${totalSteps} этапов`;
  document.getElementById("progress-percent").textContent = `${percent}%`;
  document.getElementById("progress-fill").style.width = `${percent}%`;
}

function renderProblemCard(problem) {
  return `<article class="problem-card"><span class="source">${problem.source}</span><p>${problem.prompt}</p><details><summary>Посмотреть исходный рисунок и условие</summary><figure><img src="${problem.scan}" alt="Оригинальное условие и рисунок задачи"><figcaption>Фрагмент исходной олимпиадной подборки.</figcaption></figure></details></article>`;
}

function renderOptions(problem, run, step) {
  const shift = (run.index * 2 + (problem.id === "rope" ? 1 : 0)) % step.options.length;
  return step.options.map((_, position) => {
    const index = (position + shift) % step.options.length;
    return `<button class="option" type="button" data-option="${index}" aria-pressed="false">${step.options[index]}</button>`;
  }).join("");
}

function renderStep(problem, run) {
  const step = problem.steps[run.index];
  const solved = run.statuses[run.index];
  const content = solved
    ? `<div class="feedback good"><p><strong>${solved === "assisted" ? "Этап пройден с разбором." : "Верно."}</strong></p><p>${step.explain}</p></div><div class="step-actions"><button class="primary-button" type="button" data-action="next">${run.index === problem.steps.length - 1 ? "Завершить задачу" : "Следующий этап →"}</button></div>`
    : `<p class="step-prompt">${step.prompt}</p><p class="step-support">Понадобится схема? Открой черновик кнопкой «✏️» внизу экрана.</p>${step.kind === "choice" ? `<div class="options" role="group" aria-label="Варианты ответа">${renderOptions(problem, run, step)}</div>` : `<label class="number-field"><input id="number-answer" type="text" inputmode="decimal" autocomplete="off" aria-label="Числовой ответ" placeholder="Введи число"><span>${step.unit}</span></label>`}<div class="step-actions"><button class="primary-button" type="button" data-action="check">Проверить шаг</button><span class="subtle" id="attempt-note">Объяснение откроется после проверки.</span></div><div id="step-feedback" aria-live="polite"></div>`;
  return `<article class="step-card"><div class="step-header"><div><p class="eyebrow">Этап ${run.index + 1} из ${problem.steps.length}</p><h3>${step.label}</h3></div><span class="step-number">${solved ? "✓ Выполнено" : "Твой ход"}</span></div><div class="step-track" aria-hidden="true"><span style="width:${(run.index + (solved ? 1 : 0)) / problem.steps.length * 100}%"></span></div><div class="step-body">${content}</div></article>`;
}

function renderDone(problem) {
  return `<article class="done-card"><p class="eyebrow">Маршрут задачи завершён</p><h3>${problem.title}</h3><p>Ты прошёл все ${problem.steps.length} этапов. Оставь в черновике схему и проверь ключевые идеи ещё раз.</p><ul class="recap">${problem.takeaways.map((item) => `<li>${item}</li>`).join("")}</ul><button class="secondary-button" type="button" data-action="other">${problems.every((item) => state.progress[item.id].statuses.length === item.steps.length) ? "Посмотреть другую задачу" : "Перейти к другой задаче →"}</button></article>`;
}

function render() {
  const problem = currentProblem();
  const run = currentRun();
  renderNav();
  renderProgress();
  workspace.innerHTML = `<div class="workspace-head"><p class="eyebrow">${problem.id === "graph" ? "Импульс силы" : "Механическая работа"} · олимпиада</p><h2>${problem.title}</h2><p>${problem.subtitle}</p></div>${renderProblemCard(problem)}${run.index < problem.steps.length ? renderStep(problem, run) : renderDone(problem)}`;
}

function showFeedback(message, kind, reveal = false) {
  const box = document.getElementById("step-feedback");
  if (!box) return;
  box.className = `feedback ${kind}`;
  box.replaceChildren();
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  box.append(paragraph);
  if (reveal) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.dataset.action = "reveal";
    button.textContent = "Открыть разбор и продолжить";
    button.style.marginTop = "10px";
    box.append(button);
  }
}

function checkStep() {
  const problem = currentProblem();
  const run = currentRun();
  const step = problem.steps[run.index];
  if (!step || run.statuses[run.index]) return;
  let correct = false;
  if (step.kind === "choice") {
    const selected = workspace.querySelector('.option[aria-pressed="true"]');
    if (!selected) { showFeedback("Сначала выбери ответ.", "hint"); return; }
    correct = Number(selected.dataset.option) === step.answer;
  } else {
    const raw = document.getElementById("number-answer")?.value.trim().replace(",", ".") || "";
    if (!raw) { showFeedback("Сначала введи число.", "hint"); return; }
    const value = Number(raw);
    if (!Number.isFinite(value)) { showFeedback("Введи число, например 0,5.", "hint"); return; }
    correct = Math.abs(value - step.answer) <= step.tolerance;
  }
  if (correct) {
    run.statuses[run.index] = "self";
    wrongAttempts = 0;
    saveState();
    render();
    return;
  }
  wrongAttempts += 1;
  document.getElementById("attempt-note").textContent = `Ошибок на этом этапе: ${wrongAttempts}`;
  showFeedback(wrongAttempts >= 3 ? `Пока не получилось. ${step.hint}` : `Проверь ещё раз. ${step.hint}`, wrongAttempts >= 3 ? "bad" : "hint", wrongAttempts >= 3);
}

workspace.addEventListener("click", (event) => {
  const option = event.target.closest(".option");
  if (option) {
    workspace.querySelectorAll(".option").forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "check") checkStep();
  if (action === "reveal") {
    const run = currentRun();
    run.statuses[run.index] = "assisted";
    wrongAttempts = 0;
    saveState();
    render();
  }
  if (action === "next") {
    currentRun().index += 1;
    wrongAttempts = 0;
    saveState();
    render();
    workspace.querySelector(".step-card, .done-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (action === "other") {
    state.selected = problems.find((problem) => problem.id !== state.selected).id;
    wrongAttempts = 0;
    saveState();
    render();
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

workspace.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "number-answer") checkStep();
});

nav.addEventListener("click", (event) => {
  const target = event.target.closest("[data-problem]");
  if (!target) return;
  state.selected = target.dataset.problem;
  wrongAttempts = 0;
  saveState();
  render();
  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
});

const resetButton = document.getElementById("reset-progress");
let resetPending = false;
resetButton.addEventListener("click", () => {
  if (!resetPending) {
    resetPending = true;
    resetButton.textContent = "Подтвердить сброс";
    resetButton.classList.add("confirm-reset");
    return;
  }
  state = emptyState();
  wrongAttempts = 0;
  saveState();
  render();
  resetPending = false;
  resetButton.textContent = "Начать заново";
  resetButton.classList.remove("confirm-reset");
});

document.addEventListener("click", (event) => {
  if (!resetPending || event.target === resetButton) return;
  resetPending = false;
  resetButton.textContent = "Начать заново";
  resetButton.classList.remove("confirm-reset");
});

render();
