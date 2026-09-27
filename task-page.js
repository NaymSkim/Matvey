import { PhysicsTracker } from "./tracker.js";

const params = new URLSearchParams(location.search);
const activityId = params.get("activity") || "";
const ui = {
  subject: document.querySelector("#task-subject"), title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"), variants: document.querySelector("#variant-picker"),
  banner: document.querySelector("#run-banner"), list: document.querySelector("#question-list"),
  template: document.querySelector("#question-template"), submitPanel: document.querySelector("#submit-panel"),
  submit: document.querySelector("#submit-run"), result: document.querySelector("#result-panel"),
  solutions: document.querySelector("#solutions-panel"),
};
let activity;
let content;
let selectedVariant;
let currentRun;
const answered = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function graphChoice(graph, line, index) {
  const [x1, y1, x2, y2] = line;
  return `<span class="graph-label">${index + 1}</span><svg class="mini-graph" viewBox="0 0 145 100" aria-label="График ${index + 1}"><line x1="25" y1="82" x2="134" y2="82"/><line x1="25" y1="84" x2="25" y2="7"/><line class="graph-data" x1="${Number(x1)}" y1="${Number(y1)}" x2="${Number(x2)}" y2="${Number(y2)}"/><text x="132" y="96">t</text><text x="6" y="14">${escapeHtml(graph.y)}</text></svg>`;
}

function controlFor(question) {
  const wrapper = document.createElement("div");
  wrapper.dataset.kind = question.kind;
  if (question.kind === "choice") {
    wrapper.className = "choice-grid";
    question.options.forEach((option, index) => {
      const label = document.createElement("label"); label.className = "answer-choice";
      const input = document.createElement("input"); input.type = "radio"; input.name = question.id; input.value = String(index + 1);
      const span = document.createElement("span"); span.textContent = option;
      label.append(input, span); wrapper.append(label);
    });
  } else if (question.kind === "graph") {
    wrapper.className = "choice-grid graph-grid";
    question.graph.lines.forEach((line, index) => {
      const label = document.createElement("label"); label.className = "answer-choice";
      const input = document.createElement("input"); input.type = "radio"; input.name = question.id; input.value = String(index + 1);
      const span = document.createElement("span"); span.innerHTML = graphChoice(question.graph, line, index);
      label.append(input, span); wrapper.append(label);
    });
  } else if (question.kind === "match") {
    wrapper.className = "match-control";
    question.rows.forEach((row, index) => {
      const label = document.createElement("label"); label.textContent = row;
      const select = document.createElement("select"); select.dataset.matchIndex = String(index);
      const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Выберите"; select.append(placeholder);
      question.options.forEach((option, optionIndex) => {
        const value = typeof option === "object" ? option.value : String(optionIndex + 1);
        const labelText = typeof option === "object" ? option.label : option;
        const item = document.createElement("option"); item.value = String(value); item.textContent = `${value}) ${labelText}`; select.append(item);
      });
      label.append(select); wrapper.append(label);
    });
  } else if (question.kind === "formula") {
    wrapper.className = "formula-control";
    const output = document.createElement("output"); output.className = "formula-output"; output.dataset.formulaOutput = "";
    const palette = document.createElement("div"); palette.className = "formula-palette";
    question.palette.forEach((token) => {
      const button = document.createElement("button"); button.type = "button"; button.textContent = token;
      button.addEventListener("click", () => { const tokens = JSON.parse(output.dataset.tokens || "[]"); tokens.push(token); output.dataset.tokens = JSON.stringify(tokens); output.textContent = tokens.join(" "); });
      palette.append(button);
    });
    const undo = document.createElement("button"); undo.type = "button"; undo.className = "formula-clear"; undo.textContent = "Очистить";
    undo.addEventListener("click", () => { output.dataset.tokens = "[]"; output.textContent = ""; });
    wrapper.append(output, palette, undo);
  } else if (question.kind === "ungraded-text") {
    wrapper.className = "text-control";
    const textarea = document.createElement("textarea"); textarea.rows = 5; textarea.maxLength = 4000; textarea.placeholder = "Запишите ответ для обсуждения с преподавателем";
    const note = document.createElement("p"); note.textContent = "Открытый ответ не входит в автоматическую оценку.";
    wrapper.append(textarea, note);
  } else {
    wrapper.className = "numeric-control";
    const input = document.createElement("input"); input.type = "text"; input.inputMode = "decimal"; input.placeholder = "Введите ответ";
    const unit = document.createElement("span"); unit.textContent = question.unit || "";
    wrapper.append(input, unit);
  }
  return wrapper;
}

function answerFrom(control, question) {
  if (question.kind === "choice" || question.kind === "graph") return control.querySelector("input:checked")?.value || "";
  if (question.kind === "match") return [...control.querySelectorAll("select")].map((select) => select.value);
  if (question.kind === "formula") return JSON.parse(control.querySelector("output").dataset.tokens || "[]");
  if (question.kind === "ungraded-text") return control.querySelector("textarea")?.value.trim() || "";
  return control.querySelector("input")?.value.trim().replace(",", ".") || "";
}

function renderQuestions(questions) {
  ui.list.replaceChildren(); answered.clear();
  questions.forEach((question, index) => {
    const card = ui.template.content.firstElementChild.cloneNode(true);
    card.dataset.questionId = question.id;
    card.querySelector(".question-number").textContent = `Задание ${index + 1}`;
    card.querySelector(".question-points").textContent = question.scored ? `${question.points} балл${question.points === 1 ? "" : "а"}` : "Без оценки";
    card.querySelector("h2").textContent = question.title || question.prompt;
    if (question.title && question.prompt) { const prompt = document.createElement("p"); prompt.className = "question-prompt"; prompt.textContent = question.prompt; card.querySelector("h2").after(prompt); }
    const control = controlFor(question); card.querySelector(".question-control").append(control);
    const check = card.querySelector(".check-answer");
    if (!question.scored) check.textContent = "Сохранить ответ";
    check.addEventListener("click", async () => {
        const answer = answerFrom(control, question);
        const feedback = card.querySelector(".question-feedback");
        if (answer === "" || (Array.isArray(answer) && answer.some((value) => !value))) { feedback.textContent = "Сначала введите ответ."; feedback.className = "question-feedback bad"; return; }
        check.disabled = true; feedback.textContent = "Проверяем…"; feedback.className = "question-feedback";
        try {
          const result = await PhysicsTracker.submitAnswer(currentRun.id, question.id, answer);
          if (result.queued) { feedback.textContent = "Нет сети. Ответ сохранён и будет отправлен автоматически."; feedback.className = "question-feedback queued"; }
          else if (!result.graded) { feedback.textContent = "Ответ сохранён для преподавателя."; feedback.className = "question-feedback ok"; }
          else { feedback.textContent = result.correct ? `Верно · +${result.points}` : "Ответ неверный."; feedback.className = `question-feedback ${result.correct ? "ok" : "bad"}`; }
          answered.set(question.id, result); control.querySelectorAll("input,select,button").forEach((element) => element.disabled = true);
        } catch (error) { check.disabled = false; feedback.textContent = error.message; feedback.className = "question-feedback bad"; }
      });
    ui.list.append(card);
  });
}

function selectVariant(variantId) {
  selectedVariant = content.variants.find((variant) => variant.id === variantId);
  document.querySelectorAll(".variant-button").forEach((button) => button.classList.toggle("active", button.dataset.variant === variantId));
  ui.result.hidden = true;
  ui.solutions.hidden = true;
  ui.submitPanel.hidden = true;
  ui.list.replaceChildren();
  ui.banner.hidden = false;
  ui.banner.replaceChildren();
  const text = document.createElement("div");
  const title = document.createElement("strong"); title.textContent = selectedVariant.title;
  const note = document.createElement("span"); note.textContent = "Попытка начнётся только после нажатия кнопки. После старта вариант изменить нельзя.";
  text.append(title, note);
  const start = document.createElement("button"); start.type = "button"; start.className = "primary-button compact"; start.textContent = "Начать работу";
  start.addEventListener("click", () => void beginRun(start));
  ui.banner.append(text, start);
}

async function beginRun(startButton = null) {
  if (!selectedVariant) return;
  if (startButton) { startButton.disabled = true; startButton.textContent = "Открываем…"; }
  document.querySelectorAll(".variant-button").forEach((button) => { button.disabled = true; });
  try {
    currentRun = await PhysicsTracker.startRun(activity.id, selectedVariant.id);
    if (currentRun.variantId !== selectedVariant.id) {
      selectedVariant = content.variants.find((variant) => variant.id === currentRun.variantId);
      if (!selectedVariant) throw new Error("Вариант активной попытки больше не опубликован. Обратитесь к преподавателю.");
    }
    ui.banner.hidden = false;
    const pointsWord = selectedVariant.maxPoints % 10 === 1 && selectedVariant.maxPoints % 100 !== 11 ? "балл" : selectedVariant.maxPoints % 10 >= 2 && selectedVariant.maxPoints % 10 <= 4 && !(selectedVariant.maxPoints % 100 >= 12 && selectedVariant.maxPoints % 100 <= 14) ? "балла" : "баллов";
    const heading = document.createElement("strong");
    heading.textContent = `${currentRun.runNo === 1 ? "Первая сдача" : "Пересдача"}${selectedVariant.maxPoints === 0 ? " · без оценки" : ""}`;
    const description = document.createElement("span");
    description.textContent = selectedVariant.maxPoints === 0 ? "Одна попытка на каждый вопрос. Ответы увидит преподаватель." : `Одна попытка на каждый вопрос · ${selectedVariant.maxPoints} ${pointsWord}`;
    ui.banner.replaceChildren(heading, description);
    renderQuestions(selectedVariant.questions);
    for (const attempt of currentRun.attempts || []) {
      const card = ui.list.querySelector(`[data-question-id="${CSS.escape(attempt.questionId)}"]`);
      if (!card) continue;
      const feedback = card.querySelector(".question-feedback");
      feedback.textContent = !attempt.graded ? "Ответ уже сохранён для преподавателя." : attempt.correct ? `Уже проверено: верно · +${attempt.points}` : "Уже проверено: ответ неверный.";
      feedback.className = `question-feedback ${!attempt.graded || attempt.correct ? "ok" : "bad"}`;
      card.querySelectorAll("input,select,button").forEach((element) => element.disabled = true);
      answered.set(attempt.questionId, attempt);
    }
    ui.submit.disabled = false;
    ui.submit.textContent = selectedVariant.maxPoints === 0 ? "Завершить" : "Сдать работу";
    ui.submitPanel.hidden = false;
    await showSolutionsIfReleased();
  } catch (error) {
    const panel = document.createElement("div"); panel.className = "empty-panel"; panel.textContent = error.message;
    ui.list.replaceChildren(panel);
    ui.submitPanel.hidden = true;
    document.querySelectorAll(".variant-button").forEach((button) => { button.disabled = false; });
    if (startButton) { startButton.disabled = false; startButton.textContent = "Начать работу"; }
  }
}

function renderVariants() {
  if (content.variants.length <= 1) { selectVariant(content.variants[0].id); return; }
  ui.variants.hidden = false;
  ui.variants.innerHTML = `<p>Выберите вариант или работу:</p>`;
  content.variants.forEach((variant) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "variant-button"; button.dataset.variant = variant.id; button.textContent = variant.title;
    button.addEventListener("click", () => selectVariant(variant.id)); ui.variants.append(button);
  });
}

function safeSolutionFragment(html) {
  const allowed = new Set(["P", "STRONG", "B", "EM", "I", "BR", "SUB", "SUP", "UL", "OL", "LI"]);
  const source = new DOMParser().parseFromString(String(html || ""), "text/html");
  const fragment = document.createDocumentFragment();
  const append = (input, output) => {
    input.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) output.append(document.createTextNode(node.textContent || ""));
      else if (node.nodeType === Node.ELEMENT_NODE && allowed.has(node.tagName)) {
        const clean = document.createElement(node.tagName.toLowerCase()); append(node, clean); output.append(clean);
      }
    });
  };
  append(source.body, fragment);
  return fragment;
}

async function showSolutionsIfReleased() {
  try {
    const data = await PhysicsTracker.loadReleasedSolutions(activity.id, selectedVariant.id);
    if (!data.solutions?.length) return;
    ui.solutions.hidden = false;
    const eyebrow = document.createElement("p"); eyebrow.className = "eyebrow"; eyebrow.textContent = "Разбор";
    const heading = document.createElement("h2"); heading.textContent = "Решения открыты преподавателем";
    ui.solutions.replaceChildren(eyebrow, heading);
    data.solutions.forEach((item) => {
      const article = document.createElement("article"); article.className = "solution-item";
      const label = document.createElement("b"); label.textContent = item.questionId;
      const body = document.createElement("div"); body.append(safeSolutionFragment(item.solutionHtml));
      article.append(label, body); ui.solutions.append(article);
    });
  } catch (_) { /* Solutions are intentionally unavailable before release. */ }
}

ui.submit.addEventListener("click", async () => {
  if (!currentRun || !confirm("Сдать работу? Ответы этой попытки больше нельзя будет изменить.")) return;
  ui.submit.disabled = true;
  try {
    const pending = await PhysicsTracker.flushPending(currentRun.id);
    if (pending.pending) throw new Error("Не все сохранённые ответы отправлены. Проверьте интернет и попробуйте снова.");
    if (pending.failed) throw new Error("Некоторые сохранённые ответы сервер отклонил. Обновите страницу и отправьте их заново.");
    const result = await PhysicsTracker.submitRun(currentRun.id);
    ui.submitPanel.hidden = true; ui.list.querySelectorAll("button,input,select,textarea").forEach((element) => element.disabled = true);
    ui.result.hidden = false;
    ui.result.innerHTML = result.grade == null
      ? `<p class="eyebrow">Готово</p><h2>Ответы сохранены без оценки</h2><p>Преподаватель увидит их в журнале. ${result.runNo === 1 ? "При необходимости доступна ещё одна полная сдача." : "Обе сдачи сохранены."}</p><a class="activity-link" href="./">Вернуться к каталогу <span>→</span></a>`
      : `<p class="eyebrow">Результат</p><div class="grade-circle">${result.grade}</div><h2>${result.score} из ${result.maxPoints} · ${result.percent}%</h2><p>${result.runNo === 1 ? "Теперь доступна одна пересдача. В журнал пойдёт лучший результат." : "Пересдача завершена. В журнале сохранены оба результата."}</p><a class="activity-link" href="./">Вернуться к каталогу <span>→</span></a>`;
  } catch (error) { alert(error.message); ui.submit.disabled = false; }
});

async function init() {
  if (!activityId) throw new Error("В ссылке не указана работа.");
  const [catalogResponse, contentResponse] = await Promise.all([
    fetch("data/activities.json", { cache: "no-store" }),
    fetch(`data/task-content/${encodeURIComponent(activityId)}.json`, { cache: "no-store" }),
  ]);
  if (!catalogResponse.ok || !contentResponse.ok) throw new Error("Материалы работы не найдены.");
  const catalog = (await catalogResponse.json()).activities;
  activity = catalog.find((item) => item.id === activityId);
  content = await contentResponse.json();
  if (!activity) throw new Error("Работа отсутствует в каталоге.");
  document.title = `${activity.title} · Физика`;
  ui.subject.textContent = activity.subject; ui.title.textContent = activity.title; ui.description.textContent = activity.description;
  const entryKey = `physics-entry:${activity.id}`;
  const entryId = sessionStorage.getItem(entryKey) || crypto.randomUUID();
  sessionStorage.removeItem(entryKey);
  await PhysicsTracker.openActivity(activity.id, entryId);
  renderVariants();
  const progress = await PhysicsTracker.loadProgress(activity.id);
  const active = progress.activities?.find((item) => item.activityId === activity.id)?.runs?.find((run) => run.status === "in_progress");
  if (active) {
    selectVariant(active.variantId);
    await beginRun();
  }
}

init().catch((error) => { ui.title.textContent = "Не удалось открыть работу"; ui.description.textContent = error.message; });
