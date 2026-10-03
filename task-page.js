import { PhysicsTracker } from "./tracker.js";

const params = new URLSearchParams(location.search);
const activityId = params.get("activity") || "";
const teacherPreview = params.get("preview") === "teacher";
const previewQuestionId = params.get("question") || location.hash.replace(/^#question-/, "");
const previewStudentId = params.get("student") || "";
const ui = {
  subject: document.querySelector("#task-subject"), title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"), variants: document.querySelector("#variant-picker"),
  banner: document.querySelector("#run-banner"), list: document.querySelector("#question-list"),
  template: document.querySelector("#question-template"), submitPanel: document.querySelector("#submit-panel"),
  submitTitle: document.querySelector("#submit-title"), submit: document.querySelector("#submit-run"), result: document.querySelector("#result-panel"),
  solutions: document.querySelector("#solutions-panel"), deadline: document.querySelector("#task-deadline"),
};
let activity;
let content;
let selectedVariant;
let currentRun;
let studentName = "";
let taskAccess = { isOpen: true, manuallyClosed: false, deadlineExpired: false, deadlineAt: null };
let serverOffsetMs = 0;
let autoSubmitting = false;
const answered = new Map();
const teacherAnswers = new Map();
const teacherAttempts = new Map();

const taskNow = () => Date.now() + serverOffsetMs;
const formatDate = (value) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));

function currentAccess() {
  const deadlineExpired = Boolean(taskAccess.deadlineAt && Date.parse(taskAccess.deadlineAt) <= taskNow());
  return { ...taskAccess, deadlineExpired, isOpen: !taskAccess.manuallyClosed && !deadlineExpired };
}

function remainingTime(value) {
  const seconds = Math.max(0, Math.ceil((Date.parse(value) - taskNow()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const rest = seconds % 60;
  const clock = [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
  return days ? `${days} дн. ${clock}` : clock;
}

function disableTaskControls() {
  ui.list.querySelectorAll("button,input,select,textarea").forEach((element) => { element.disabled = true; });
  document.querySelectorAll(".variant-button").forEach((button) => { button.disabled = true; });
  ui.submit.disabled = true;
}

function updateDeadline() {
  const access = currentAccess();
  taskAccess = access;
  if (access.manuallyClosed) {
    ui.deadline.hidden = false;
    ui.deadline.className = "task-deadline closed";
    ui.deadline.textContent = studentName ? `${studentName}, работа закрыта преподавателем.` : "Работа закрыта преподавателем.";
  } else if (access.deadlineAt) {
    ui.deadline.hidden = false;
    ui.deadline.className = `task-deadline${access.deadlineExpired ? " closed" : ""}`;
    ui.deadline.textContent = access.deadlineExpired
      ? `${studentName ? `${studentName}, ` : ""}время вышло · срок был ${formatDate(access.deadlineAt)}`
      : `${studentName ? `${studentName}, ` : ""}сдать до ${formatDate(access.deadlineAt)} · осталось ${remainingTime(access.deadlineAt)}`;
  } else ui.deadline.hidden = true;
  if (!access.isOpen && currentRun?.status === "in_progress") void finishRun(true);
  else if (!access.isOpen && !currentRun) renderClosedState();
}

function renderClosedState() {
  const access = currentAccess();
  ui.variants.hidden = true;
  ui.submitPanel.hidden = true;
  ui.banner.hidden = false;
  const heading = document.createElement("strong");
  heading.textContent = access.manuallyClosed ? `${studentName ? `${studentName}, ` : ""}работа закрыта` : `${studentName ? `${studentName}, ` : ""}время выполнения истекло`;
  const description = document.createElement("span");
  description.textContent = access.deadlineAt ? `Срок завершился ${formatDate(access.deadlineAt)}.` : "Преподаватель пока не открыл эту работу.";
  ui.banner.replaceChildren(heading, description);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function graphChoice(graph, line, index) {
  const [x1, y1, x2, y2] = line;
  return `<span class="graph-label">${index + 1}</span><svg class="mini-graph" viewBox="0 0 145 100" aria-label="График ${index + 1}"><line x1="25" y1="82" x2="134" y2="82"/><line x1="25" y1="84" x2="25" y2="7"/><line class="graph-data" x1="${Number(x1)}" y1="${Number(y1)}" x2="${Number(x2)}" y2="${Number(y2)}"/><text x="132" y="96">t</text><text x="6" y="14">${escapeHtml(graph.y)}</text></svg>`;
}

const velocityDiagrams = {
  g6v1q2: { t: 4, v: 24, xt: [0, 4], yt: [0, 12, 24], lines: [{ points: [[0, 12], [4, 24]] }] },
  g6v1q3: { t: 40, v: 20, xt: [0, 10, 20, 30, 40], yt: [0, 5, 10, 20], lines: [{ points: [[0, 0], [10, 5], [20, 20], [30, 0], [40, 10]] }] },
  g6v2q2: { t: 3, v: 60, xt: [0, 1, 2, 3], yt: [0, 30, 60], lines: [{ points: [[0, 30], [1, 60]], label: "I" }, { points: [[0, 0], [3, 60]], label: "II" }] },
  g6v2q3: { t: 30, v: 20, xt: [0, 10, 20, 30], yt: [0, 10, 15, 20], lines: [{ points: [[0, 15], [10, 0], [20, 20], [30, 10]] }] },
  g7v1q3: { t: 10, v: 20, xt: [0, 5, 10], yt: [0, 10, 20], lines: [{ points: [[0, 10], [10, 20]] }] },
  g7v2q3: { t: 3, v: 15, xt: [0, 1, 2, 3], yt: [0, 5, 10, 15], lines: [{ points: [[0, 15], [3, 10]], label: "I" }, { points: [[0, 10], [3, 10]], label: "II" }, { points: [[0, 5], [3, 10]], label: "III" }] },
};

function diagramMarkup(key) {
  if (key === "vectors1" || key === "vectors2") {
    const first = key === "vectors1";
    const marker = `vector-arrow-${key}`;
    const given = first
      ? `<text x="92" y="28" font-weight="800">v</text><line x1="105" y1="112" x2="105" y2="42" stroke="#2563eb" stroke-width="5" marker-end="url(#${marker}-blue)"/><text x="26" y="104" font-weight="800">a</text><line x1="100" y1="116" x2="35" y2="116" stroke="#ea580c" stroke-width="5" marker-end="url(#${marker}-orange)"/>`
      : `<text x="92" y="98" font-weight="800">v</text><line x1="55" y1="116" x2="145" y2="116" stroke="#2563eb" stroke-width="5" marker-end="url(#${marker}-blue)"/><text x="92" y="28" font-weight="800">F</text><line x1="105" y1="112" x2="105" y2="42" stroke="#ea580c" stroke-width="5" marker-end="url(#${marker}-orange)"/>`;
    const choices = first
      ? `<line x1="355" y1="90" x2="355" y2="150" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="366" y="152">1</text><line x1="355" y1="90" x2="285" y2="90" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="270" y="84">2</text><line x1="355" y1="90" x2="300" y2="38" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="288" y="31">3</text><line x1="355" y1="90" x2="355" y2="30" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="365" y="32">4</text>`
      : `<line x1="355" y1="95" x2="430" y2="95" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="437" y="100">1</text><line x1="355" y1="95" x2="410" y2="42" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="416" y="38">2</text><line x1="355" y1="95" x2="355" y2="30" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="365" y="32">3</text><line x1="355" y1="95" x2="285" y2="95" stroke="#168653" stroke-width="4" marker-end="url(#${marker}-green)"/><text x="270" y="88">4</text>`;
    return `<svg viewBox="0 0 500 180" role="img" aria-label="Схема направлений векторов"><defs><marker id="${marker}-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#2563eb"/></marker><marker id="${marker}-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#ea580c"/></marker><marker id="${marker}-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#168653"/></marker></defs><rect x="8" y="8" width="205" height="160" rx="12" fill="#fff"/><rect x="235" y="8" width="255" height="160" rx="12" fill="#fff"/><text x="24" y="158">Дано</text><text x="250" y="158">Выберите направление</text>${given}${choices}</svg>`;
  }
  if (key === "coord1" || key === "coord2") {
    const start = key === "coord1" ? [6, 1] : [4, 4];
    const end = key === "coord1" ? [2, 5] : [2, 1];
    const mapX = (value) => 42 + value * 34;
    const mapY = (value) => 226 - value * 30;
    const grid = Array.from({ length: 7 }, (_, value) => `<line class="diagram-grid" x1="${mapX(value)}" y1="46" x2="${mapX(value)}" y2="226"/><line class="diagram-grid" x1="42" y1="${mapY(value)}" x2="246" y2="${mapY(value)}"/>`).join("");
    const ticks = Array.from({ length: 7 }, (_, value) => `<text x="${mapX(value) - 4}" y="244">${value}</text><text x="24" y="${mapY(value) + 4}">${value}</text>`).join("");
    return `<svg viewBox="0 0 300 260" role="img" aria-label="Координатная плоскость: вектор из точки A (${start[0]}; ${start[1]}) в точку B (${end[0]}; ${end[1]})"><defs><marker id="arrow-${key}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" class="diagram-arrow"/></marker></defs>${grid}<line class="diagram-axis" x1="42" y1="226" x2="275" y2="226"/><line class="diagram-axis" x1="42" y1="226" x2="42" y2="25"/><path class="diagram-vector" d="M${mapX(start[0])} ${mapY(start[1])} L${mapX(end[0])} ${mapY(end[1])}" marker-end="url(#arrow-${key})"/><circle class="diagram-point" cx="${mapX(start[0])}" cy="${mapY(start[1])}" r="5"/><circle class="diagram-point" cx="${mapX(end[0])}" cy="${mapY(end[1])}" r="5"/><text class="diagram-label" x="${mapX(start[0]) - 22}" y="${mapY(start[1]) - 10}">A (${start[0]}; ${start[1]})</text><text class="diagram-label" x="${mapX(end[0]) + 8}" y="${mapY(end[1]) - 9}">B (${end[0]}; ${end[1]})</text><text x="268" y="247">x, м</text><text x="7" y="26">y, м</text>${ticks}</svg>`;
  }
  if (key === "speed1" || key === "speed2") {
    const negative = key === "speed2";
    const y = negative ? 150 : 55;
    const label = negative ? "−10" : "15";
    return `<svg viewBox="0 0 330 190" role="img" aria-label="График проекции скорости: ${label} метров в секунду в течение двух секунд"><line class="diagram-axis" x1="46" y1="100" x2="300" y2="100"/><line class="diagram-axis" x1="46" y1="165" x2="46" y2="18"/><line class="diagram-vector" x1="46" y1="${y}" x2="260" y2="${y}"/><line class="diagram-grid dashed" x1="260" y1="28" x2="260" y2="164"/><text x="292" y="120">t, с</text><text x="8" y="22">vₓ, м/с</text><text x="22" y="${y + 4}">${label}</text><text x="254" y="118">2</text></svg>`;
  }
  const graph = velocityDiagrams[key];
  if (!graph) return "";
  const mapX = (value) => 50 + value / graph.t * 260;
  const mapY = (value) => 178 - value / graph.v * 135;
  const grid = [...graph.xt.map((value) => `<line class="diagram-grid" x1="${mapX(value)}" y1="38" x2="${mapX(value)}" y2="178"/><text x="${mapX(value) - 4}" y="198">${value}</text>`), ...graph.yt.map((value) => `<line class="diagram-grid" x1="50" y1="${mapY(value)}" x2="310" y2="${mapY(value)}"/><text x="22" y="${mapY(value) + 4}">${value}</text>`)].join("");
  const colors = ["#2563eb", "#ea580c", "#168653"];
  const lines = graph.lines.map((line, index) => {
    const points = line.points.map((point) => `${mapX(point[0])},${mapY(point[1])}`).join(" ");
    const middle = line.points[Math.floor((line.points.length - 1) / 2)];
    const label = line.label ? `<text class="diagram-series-label" x="${mapX(middle[0]) + 10}" y="${mapY(middle[1]) - 8}" fill="${colors[index]}">${line.label}</text>` : "";
    return `<polyline points="${points}" fill="none" stroke="${colors[index]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${label}`;
  }).join("");
  return `<svg viewBox="0 0 350 220" role="img" aria-label="График зависимости проекции скорости от времени">${grid}<line class="diagram-axis" x1="50" y1="178" x2="326" y2="178"/><line class="diagram-axis" x1="50" y1="190" x2="50" y2="22"/>${lines}<text x="322" y="201">t, с</text><text x="7" y="23">vₓ, м/с</text></svg>`;
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

function teacherAnswerText(question, answer) {
  if (!answer || answer.matcherType === "ungraded") return "Открытый вопрос без автоматического ключа.";
  const expected = answer.expected;
  if (answer.matcherType === "choice") {
    const number = Number(expected);
    const option = question.options?.[number - 1];
    return option == null ? `Вариант ${number}` : `Вариант ${number}: ${typeof option === "object" ? option.label : option}`;
  }
  if (answer.matcherType === "match" && Array.isArray(expected)) {
    return expected.map((value, index) => {
      const option = question.options?.find((item, optionIndex) => String(typeof item === "object" ? item.value : optionIndex + 1) === String(value));
      const label = typeof option === "object" ? option.label : option;
      return `${question.rows?.[index] || index + 1} — ${label || value}`;
    }).join("; ");
  }
  if (Array.isArray(expected)) return expected.join(" ");
  const unit = question.unit ? ` ${question.unit}` : "";
  const tolerance = answer.matcherType === "numeric" && Number(answer.tolerance) > 0 ? ` (допуск ±${answer.tolerance})` : "";
  return `${expected ?? "—"}${unit}${tolerance}`;
}

function appendTeacherAnswer(card, question) {
  const answer = teacherAnswers.get(`${selectedVariant.id}/${question.id}`);
  const panel = document.createElement("div");
  panel.className = "teacher-answer";
  const label = document.createElement("strong");
  label.textContent = answer?.matcherType === "ungraded" ? "Проверка преподавателем" : "Правильный ответ";
  const value = document.createElement("div");
  value.textContent = teacherAnswerText(question, answer);
  panel.append(label, value);
  if (answer?.solutionHtml) {
    const solution = document.createElement("div");
    solution.className = "teacher-solution";
    solution.append(safeSolutionFragment(answer.solutionHtml));
    panel.append(solution);
  }
  card.append(panel);
}

function displayAnswer(question, value) {
  if (value == null || value === "") return "Ответ не указан";
  if (question.kind === "choice") {
    const option = question.options?.[Number(value) - 1];
    return option == null ? `Вариант ${value}` : `Вариант ${value}: ${typeof option === "object" ? option.label : option}`;
  }
  if (question.kind === "graph") return `График ${value}`;
  if (question.kind === "match" && Array.isArray(value)) {
    return value.map((selected, index) => {
      const option = question.options?.find((item, optionIndex) => String(typeof item === "object" ? item.value : optionIndex + 1) === String(selected));
      return `${question.rows?.[index] || index + 1} — ${typeof option === "object" ? option.label : option || selected}`;
    }).join("; ");
  }
  if (Array.isArray(value)) return value.join(" ");
  return `${value}${question.unit ? ` ${question.unit}` : ""}`;
}

function showStudentChoice(control, question, attempt) {
  if (!attempt) return;
  if (question.kind === "choice" || question.kind === "graph") {
    const input = [...control.querySelectorAll("input")].find((item) => item.value === String(attempt.answer));
    if (input) input.checked = true;
  } else if (question.kind === "match" && Array.isArray(attempt.answer)) {
    [...control.querySelectorAll("select")].forEach((select, index) => { select.value = String(attempt.answer[index] ?? ""); });
  } else if (question.kind === "formula") {
    const output = control.querySelector("output");
    const tokens = Array.isArray(attempt.answer) ? attempt.answer : [];
    output.dataset.tokens = JSON.stringify(tokens);
    output.textContent = tokens.join(" ");
  } else if (question.kind === "ungraded-text") control.querySelector("textarea").value = String(attempt.answer ?? "");
  else control.querySelector("input").value = String(attempt.answer ?? "");
}

function appendStudentAnswer(card, question, attempt) {
  const panel = document.createElement("div");
  panel.className = `teacher-student-answer${attempt?.graded && !attempt.correct ? " wrong" : ""}`;
  const label = document.createElement("strong");
  label.textContent = studentName ? `Ответ ученика: ${studentName}` : "Ответ ученика";
  const value = document.createElement("div");
  value.textContent = attempt ? `${displayAnswer(question, attempt.answer)}${attempt.graded ? attempt.correct ? " · верно" : " · неверно" : ""}` : "На этот вопрос ответа пока нет.";
  panel.append(label, value);
  card.append(panel);
}

function renderQuestions(questions) {
  ui.list.replaceChildren(); answered.clear();
  questions.forEach((question, index) => {
    const card = ui.template.content.firstElementChild.cloneNode(true);
    card.dataset.questionId = question.id;
    card.id = `question-${question.id}`;
    card.querySelector(".question-number").textContent = `Задание ${index + 1}`;
    card.querySelector(".question-points").textContent = question.scored ? `${question.points} балл${question.points === 1 ? "" : "а"}` : "Без оценки";
    card.querySelector("h2").textContent = question.title || question.prompt;
    if (question.title && question.prompt) { const prompt = document.createElement("p"); prompt.className = "question-prompt"; prompt.textContent = question.prompt; card.querySelector("h2").after(prompt); }
    if (question.diagram) {
      const markup = diagramMarkup(question.diagram);
      if (markup) { const diagram = document.createElement("div"); diagram.className = "question-diagram"; diagram.innerHTML = markup; card.querySelector(".question-control").before(diagram); }
    }
    const control = controlFor(question); card.querySelector(".question-control").append(control);
    const check = card.querySelector(".check-answer");
    if (teacherPreview) {
      const attempt = teacherAttempts.get(`${selectedVariant.id}/${question.id}`);
      showStudentChoice(control, question, attempt);
      check.remove();
      control.querySelectorAll("input,select,button,textarea").forEach((element) => { element.disabled = true; });
      appendStudentAnswer(card, question, attempt);
      appendTeacherAnswer(card, question);
    } else {
      if (!question.scored) check.textContent = "Сохранить ответ";
      check.addEventListener("click", async () => {
        if (!currentAccess().isOpen) { updateDeadline(); return; }
        const answer = answerFrom(control, question);
        const feedback = card.querySelector(".question-feedback");
        if (answer === "" || (Array.isArray(answer) && answer.some((value) => !value))) { feedback.textContent = "Сначала введите ответ."; feedback.className = "question-feedback bad"; return; }
        check.disabled = true; feedback.textContent = "Проверяем…"; feedback.className = "question-feedback";
        try {
          const result = await PhysicsTracker.submitAnswer(currentRun.id, question.id, answer);
          if (result.queued) { feedback.textContent = "Нет сети. Ответ сохранён и будет отправлен автоматически."; feedback.className = "question-feedback queued"; }
          else if (!result.graded) { feedback.textContent = `${studentName ? `${studentName}, ` : ""}ответ сохранён для преподавателя.`; feedback.className = "question-feedback ok"; }
          else { feedback.textContent = result.correct ? `${studentName ? `${studentName}, ` : ""}верно · +${result.points}` : `${studentName ? `${studentName}, ` : ""}ответ неверный.`; feedback.className = `question-feedback ${result.correct ? "ok" : "bad"}`; }
          answered.set(question.id, result); control.querySelectorAll("input,select,button,textarea").forEach((element) => element.disabled = true);
        } catch (error) { check.disabled = false; feedback.textContent = error.message; feedback.className = "question-feedback bad"; }
      });
    }
    ui.list.append(card);
  });
}

function focusPreviewQuestion() {
  if (!teacherPreview || !previewQuestionId) return;
  const target = document.getElementById(`question-${previewQuestionId}`);
  if (!target) return;
  target.classList.add("teacher-focus");
  requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function renderTeacherPreview(variantId) {
  selectedVariant = content.variants.find((variant) => variant.id === variantId) || content.variants[0];
  document.querySelectorAll(".variant-button").forEach((button) => button.classList.toggle("active", button.dataset.variant === selectedVariant.id));
  ui.result.hidden = true;
  ui.solutions.hidden = true;
  ui.submitPanel.hidden = true;
  ui.banner.hidden = false;
  const heading = document.createElement("strong"); heading.textContent = "Просмотр преподавателя";
  const description = document.createElement("span"); description.textContent = `${selectedVariant.title}${studentName ? ` · ответы ученика ${studentName}` : ""} · изменения не сохраняются`;
  ui.banner.replaceChildren(heading, description);
  renderQuestions(selectedVariant.questions);
  focusPreviewQuestion();
}

function selectVariant(variantId) {
  if (teacherPreview) { renderTeacherPreview(variantId); return; }
  if (!currentAccess().isOpen && !currentRun) { renderClosedState(); return; }
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
  const note = document.createElement("span"); note.textContent = `${studentName ? `${studentName}, ` : ""}попытка начнётся только после нажатия кнопки. После старта вариант изменить нельзя.`;
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
    if (currentRun.access) taskAccess = currentRun.access;
    if (currentRun.variantId !== selectedVariant.id) {
      selectedVariant = content.variants.find((variant) => variant.id === currentRun.variantId);
      if (!selectedVariant) throw new Error("Вариант активной попытки больше не опубликован. Обратитесь к преподавателю.");
    }
    ui.banner.hidden = false;
    const pointsWord = selectedVariant.maxPoints % 10 === 1 && selectedVariant.maxPoints % 100 !== 11 ? "балл" : selectedVariant.maxPoints % 10 >= 2 && selectedVariant.maxPoints % 10 <= 4 && !(selectedVariant.maxPoints % 100 >= 12 && selectedVariant.maxPoints % 100 <= 14) ? "балла" : "баллов";
    const heading = document.createElement("strong");
    heading.textContent = `${studentName ? `${studentName} · ` : ""}${currentRun.runNo === 1 ? "Первая сдача" : "Пересдача"}${selectedVariant.maxPoints === 0 ? " · без оценки" : ""}`;
    const description = document.createElement("span");
    description.textContent = selectedVariant.maxPoints === 0 ? "Одна попытка на каждый вопрос. Ответы увидит преподаватель." : `Одна попытка на каждый вопрос · ${selectedVariant.maxPoints} ${pointsWord}`;
    ui.banner.replaceChildren(heading, description);
    renderQuestions(selectedVariant.questions);
    for (const attempt of currentRun.attempts || []) {
      const card = ui.list.querySelector(`[data-question-id="${CSS.escape(attempt.questionId)}"]`);
      if (!card) continue;
      const feedback = card.querySelector(".question-feedback");
      feedback.textContent = !attempt.graded ? `${studentName ? `${studentName}, ` : ""}ответ уже сохранён для преподавателя.` : attempt.correct ? `${studentName ? `${studentName}, ` : ""}уже проверено: верно · +${attempt.points}` : `${studentName ? `${studentName}, ` : ""}уже проверено: ответ неверный.`;
      feedback.className = `question-feedback ${!attempt.graded || attempt.correct ? "ok" : "bad"}`;
      card.querySelectorAll("input,select,button,textarea").forEach((element) => element.disabled = true);
      answered.set(attempt.questionId, attempt);
    }
    ui.submit.disabled = false;
    ui.submit.textContent = selectedVariant.maxPoints === 0 ? "Завершить" : "Сдать работу";
    ui.submitPanel.hidden = false;
    await showSolutionsIfReleased();
    updateDeadline();
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
    const heading = document.createElement("h2"); heading.textContent = studentName ? `${studentName}, решения открыты преподавателем` : "Решения открыты преподавателем";
    ui.solutions.replaceChildren(eyebrow, heading);
    data.solutions.forEach((item) => {
      const article = document.createElement("article"); article.className = "solution-item";
      const label = document.createElement("b"); label.textContent = item.questionId;
      const body = document.createElement("div"); body.append(safeSolutionFragment(item.solutionHtml));
      article.append(label, body); ui.solutions.append(article);
    });
  } catch (_) { /* Solutions are intentionally unavailable before release. */ }
}

function renderResult(result, automatic = false) {
  ui.submitPanel.hidden = true;
  disableTaskControls();
  ui.result.hidden = false;
  const safeName = escapeHtml(studentName);
  const automaticNote = automatic ? `${safeName ? `${safeName}, ` : ""}время закончилось, поэтому работа была сдана автоматически. ` : "";
  ui.result.innerHTML = result.grade == null
    ? `<p class="eyebrow">Готово</p><h2>${safeName ? `${safeName}, ответы` : "Ответы"} сохранены без оценки</h2><p>${automaticNote}Преподаватель увидит их в журнале. ${result.runNo === 1 ? "При необходимости доступна ещё одна полная сдача." : "Обе сдачи сохранены."}</p><a class="activity-link" href="./">Вернуться к каталогу <span>→</span></a>`
    : `<p class="eyebrow">Результат${safeName ? ` · ${safeName}` : ""}</p><div class="grade-circle">${result.grade}</div><h2>${safeName ? `${safeName}, ` : ""}${result.score} из ${result.maxPoints} · ${result.percent}%</h2><p>${automaticNote}${result.runNo === 1 ? "Теперь доступна одна пересдача. В журнал пойдёт лучший результат." : "Пересдача завершена. В журнале сохранены оба результата."}</p><a class="activity-link" href="./">Вернуться к каталогу <span>→</span></a>`;
}

async function finishRun(automatic = false) {
  if (!currentRun || currentRun.status !== "in_progress" || autoSubmitting) return;
  autoSubmitting = true;
  ui.submit.disabled = true;
  if (automatic) {
    disableTaskControls();
    ui.submit.textContent = "Время вышло — сдаём…";
    PhysicsTracker.discardPending(currentRun.id);
  }
  try {
    if (!automatic) {
      const pending = await PhysicsTracker.flushPending(currentRun.id);
      if (pending.pending) throw new Error("Не все сохранённые ответы отправлены. Проверьте интернет и попробуйте снова.");
      if (pending.failed) throw new Error("Некоторые ответы не удалось сохранить. Обновите страницу и отправьте их заново.");
    }
    const result = await PhysicsTracker.submitRun(currentRun.id);
    currentRun.status = "submitted";
    renderResult(result, automatic);
  } catch (error) {
    if (automatic) {
      ui.submitPanel.hidden = false;
      ui.submit.disabled = false;
      ui.submit.textContent = "Завершить сдачу";
      document.querySelector("#submit-note").textContent = "Время закончилось. Нажмите кнопку после восстановления связи.";
    } else {
      alert(error.message);
      ui.submit.disabled = false;
    }
  } finally { autoSubmitting = false; }
}

ui.submit.addEventListener("click", async () => {
  if (!currentRun || (!currentAccess().isOpen && ui.submit.textContent !== "Завершить сдачу")) return;
  if (currentAccess().isOpen && !confirm(`${studentName ? `${studentName}, сдать работу?` : "Сдать работу?"} Ответы этой попытки больше нельзя будет изменить.`)) return;
  await finishRun(!currentAccess().isOpen);
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
  if (teacherPreview) {
    document.querySelector(".brand small").textContent = "Просмотр";
    const answerData = await PhysicsTracker.loadTeacherAnswers(activity.id, previewStudentId);
    studentName = answerData.student?.name || "";
    answerData.answers.forEach((answer) => teacherAnswers.set(`${answer.variantId}/${answer.questionId}`, answer));
    answerData.attempts.forEach((attempt) => {
      const key = `${attempt.variantId}/${attempt.questionId}`;
      if (!teacherAttempts.has(key)) teacherAttempts.set(key, attempt);
    });
    const targetVariant = content.variants.find((variant) => variant.questions.some((question) => question.id === previewQuestionId)) || content.variants[0];
    renderVariants();
    if (content.variants.length > 1) renderTeacherPreview(targetVariant.id);
    return;
  }
  const entryKey = `physics-entry:${activity.id}`;
  const entryId = sessionStorage.getItem(entryKey) || crypto.randomUUID();
  sessionStorage.removeItem(entryKey);
  const opened = await PhysicsTracker.openActivity(activity.id, entryId);
  const progress = await PhysicsTracker.loadProgress(activity.id);
  studentName = progress.student?.name || "";
  if (studentName) {
    document.title = `${studentName} · ${activity.title}`;
    document.querySelector(".brand small").textContent = studentName;
    ui.submitTitle.textContent = `${studentName}, после сдачи ответы нельзя будет изменить`;
  }
  if (progress.serverTime) serverOffsetMs = Date.parse(progress.serverTime) - Date.now();
  const activityProgress = progress.activities?.find((item) => item.activityId === activity.id);
  taskAccess = activityProgress || opened.access || taskAccess;
  const active = activityProgress?.runs?.find((run) => run.status === "in_progress");
  if (active) {
    currentRun = active;
    selectVariant(active.variantId);
    await beginRun();
  } else if (currentAccess().isOpen) renderVariants();
  else renderClosedState();
  updateDeadline();
  window.setInterval(updateDeadline, 1000);
}

init().catch((error) => { ui.title.textContent = "Не удалось открыть работу"; ui.description.textContent = error.message; });
