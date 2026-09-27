import { PhysicsTracker } from "./tracker.js";
import { getSupabaseClient, invokeFunction } from "./supabase-client.js";

const state = { activities: [], progress: new Map(), topic: "Все", student: null, client: null, serverOffsetMs: 0 };
const portalEntryId = crypto.randomUUID();
const fingerprintKey = "physics-portal-device-v1";
const ui = {
  grid: document.querySelector("#activity-grid"),
  template: document.querySelector("#activity-template"),
  search: document.querySelector("#search"),
  filters: document.querySelector("#topic-filters"),
  empty: document.querySelector("#empty-panel"),
  dialog: document.querySelector("#student-dialog"),
  form: document.querySelector("#student-form"),
  error: document.querySelector("#student-error"),
  pill: document.querySelector("#student-pill"),
  change: document.querySelector("#change-student"),
  completed: document.querySelector("#completed-count"),
  progressBar: document.querySelector("#progress-bar"),
  progressNote: document.querySelector("#progress-note"),
};

async function invoke(name, body = {}) {
  return invokeFunction(name, body);
}

async function loadCatalog() {
  const response = await fetch("data/activities.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Не удалось загрузить каталог работ.");
  const payload = await response.json();
  state.activities = payload.activities.filter((item) => item.published).sort((a, b) => a.order - b.order);
}

const portalNow = () => Date.now() + state.serverOffsetMs;
const formatDate = (value) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

function accessFor(activityId) {
  const saved = state.progress.get(activityId);
  if (!state.student || !saved) return { known: false, isOpen: true, deadlineAt: null, manuallyClosed: false, deadlineExpired: false };
  const deadlineExpired = Boolean(saved.deadlineAt && Date.parse(saved.deadlineAt) <= portalNow());
  return { ...saved, known: true, deadlineExpired, isOpen: !saved.manuallyClosed && !deadlineExpired };
}

function remainingTime(value) {
  const seconds = Math.max(0, Math.ceil((Date.parse(value) - portalNow()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const rest = seconds % 60;
  const clock = [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
  return days ? `${days} дн. ${clock}` : clock;
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const activities = () => state.activities.map(({ id, title, subject, description, verificationMode, url }) => ({ id, title, subject, description, verificationMode, url }));
  const validate = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Ожидается объект с параметрами.");
    return input;
  };
  const report = (error) => console.warn("WebMCP:", error);
  try {
    void Promise.resolve(context.registerTool({
      name: "list_physics_activities",
      title: "Список работ по физике",
      description: "Показывает опубликованные работы портала; можно отфильтровать по теме или поисковой строке.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" }, subject: { type: "string" } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const value = validate(input);
        const query = typeof value.query === "string" ? value.query.trim().toLocaleLowerCase("ru") : "";
        const subject = typeof value.subject === "string" ? value.subject.trim() : "";
        return { activities: activities().filter((item) => (!subject || item.subject === subject) && (!query || `${item.title} ${item.description}`.toLocaleLowerCase("ru").includes(query))) };
      },
    })).catch(report);
    void Promise.resolve(context.registerTool({
      name: "open_physics_activity",
      title: "Открыть работу по физике",
      description: "Фиксирует посещение выбранной работы для вошедшего ученика и открывает её так же, как кнопка в каталоге.",
      inputSchema: {
        type: "object",
        properties: { activityId: { type: "string", pattern: "^[a-z0-9-]+$" } },
        required: ["activityId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const value = validate(input);
        if (typeof value.activityId !== "string") throw new Error("Укажите activityId.");
        const activity = state.activities.find((item) => item.id === value.activityId);
        if (!activity) throw new Error("Работа не найдена.");
        if (!state.student) throw new Error("Сначала войдите как ученик.");
        if (!accessFor(activity.id).isOpen) throw new Error("Эта работа сейчас закрыта.");
        const entryId = crypto.randomUUID();
        sessionStorage.setItem(`physics-entry:${activity.id}`, entryId);
        await PhysicsTracker.openActivity(activity.id, entryId);
        setTimeout(() => { location.href = activity.url; }, 0);
        return { opened: true, activityId: activity.id, title: activity.title };
      },
    })).catch(report);
  } catch (error) { report(error); }
}

function renderFilters() {
  const topics = ["Все", ...new Set(state.activities.map((item) => item.subject))];
  ui.filters.replaceChildren(...topics.map((topic) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${topic === state.topic ? " active" : ""}`;
    button.textContent = topic;
    button.addEventListener("click", () => { state.topic = topic; renderFilters(); renderActivities(); });
    return button;
  }));
}

function renderActivities() {
  const query = ui.search.value.trim().toLocaleLowerCase("ru");
  const filtered = state.activities.filter((item) => {
    const topicMatches = state.topic === "Все" || item.subject === state.topic;
    const text = `${item.title} ${item.subject} ${item.description}`.toLocaleLowerCase("ru");
    return topicMatches && (!query || text.includes(query));
  });
  ui.grid.replaceChildren(...filtered.map((activity) => activityCard(activity)));
  ui.empty.hidden = filtered.length !== 0;
  updateSummary();
}

function plural(number, one, few, many) {
  const value = Math.abs(number) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function activityCard(activity) {
  const card = ui.template.content.firstElementChild.cloneNode(true);
  const progress = state.progress.get(activity.id);
  const access = accessFor(activity.id);
  const best = progress?.bestRun;
  card.dataset.mode = activity.verificationMode;
  card.classList.toggle("is-complete", Boolean(best));
  card.classList.toggle("is-closed", access.known && !access.isOpen);
  card.querySelector(".subject-label").textContent = activity.subject;
  card.querySelector(".activity-state").textContent = access.known && !access.isOpen ? (access.manuallyClosed ? "Закрыта" : "Время истекло") : activity.verificationMode === "visit-only" ? "Без оценки" : best ? (best.grade == null ? "Сдано" : `Оценка ${best.grade}`) : "Не сдано";
  card.querySelector("h3").textContent = activity.title;
  card.querySelector(".activity-description").textContent = activity.description;
  const count = activity.verificationMode === "visit-only"
    ? `${activity.questionCount} ${plural(activity.questionCount, "задача", "задачи", "задач")}`
    : activity.maxPoints === 0
      ? `${activity.questionCount} ${plural(activity.questionCount, "вопрос", "вопроса", "вопросов")} · без оценки`
      : `${activity.questionCount} ${plural(activity.questionCount, "вопрос", "вопроса", "вопросов")} · ${activity.maxPoints} ${plural(activity.maxPoints, "балл", "балла", "баллов")}`;
  card.querySelector(".activity-meta").textContent = `${count} · ${activity.difficulty}`;
  const deadline = card.querySelector(".activity-deadline");
  if (access.deadlineAt) {
    deadline.hidden = false;
    deadline.textContent = access.deadlineExpired
      ? `Срок завершён: ${formatDate(access.deadlineAt)}`
      : `До ${formatDate(access.deadlineAt)} · осталось ${remainingTime(access.deadlineAt)}`;
  }
  const bar = card.querySelector(".card-progress");
  if (best) {
    bar.hidden = false;
    bar.querySelector("b").textContent = best.percent == null ? "Ответы сохранены" : `${best.score}/${best.maxPoints} · ${best.percent}%`;
    bar.querySelector(".progress-track").hidden = best.percent == null;
    if (best.percent != null) bar.querySelector(".progress-track span").style.width = `${best.percent}%`;
  }
  const link = card.querySelector(".activity-link");
  if (access.known && !access.isOpen) {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
    link.textContent = "Работа закрыта";
  } else link.href = activity.url;
  link.addEventListener("click", async (event) => {
    if (!state.student) {
      event.preventDefault();
      openStudentDialog();
      return;
    }
    if (!accessFor(activity.id).isOpen) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const entryId = crypto.randomUUID();
    sessionStorage.setItem(`physics-entry:${activity.id}`, entryId);
    try { await PhysicsTracker.openActivity(activity.id, entryId); }
    catch (_) { /* The task page will retry and show a useful error if needed. */ }
    location.href = activity.url;
  });
  return card;
}

function updateSummary() {
  const graded = state.activities.filter((item) => item.verificationMode === "server-graded");
  const completed = graded.filter((item) => state.progress.get(item.id)?.bestRun).length;
  ui.completed.textContent = `${completed} из ${graded.length}`;
  ui.progressBar.style.width = graded.length ? `${completed / graded.length * 100}%` : "0%";
  ui.progressNote.textContent = state.student ? (completed ? "Продолжай в том же темпе." : "Выбери первую работу из каталога.") : "Войди, чтобы увидеть свой прогресс.";
}

function showStudent(student) {
  state.student = student;
  ui.pill.textContent = student.name;
  ui.pill.hidden = false;
  ui.change.hidden = false;
}

function openStudentDialog() {
  ui.error.hidden = true;
  ui.dialog.showModal();
  requestAnimationFrame(() => document.querySelector("#student-name").focus());
}

async function signInStudent(name, code) {
  if (!state.client) throw new Error("Supabase ещё не подключён. Добавьте адрес проекта и публичный ключ в config.js.");
  let { data: sessionData } = await state.client.auth.getSession();
  if (!sessionData.session) {
    const { error } = await state.client.auth.signInAnonymously();
    if (error) throw error;
  }
  let clientFingerprint = localStorage.getItem(fingerprintKey) || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientFingerprint)) {
    clientFingerprint = crypto.randomUUID();
    localStorage.setItem(fingerprintKey, clientFingerprint);
  }
  const result = await invoke("claim-student", { name, code, clientFingerprint });
  showStudent(result.student);
  await recordPortalVisit();
  await loadProgress();
}

async function loadProgress() {
  if (!state.client || !state.student) return;
  const data = await invoke("student-progress");
  if (data.serverTime) state.serverOffsetMs = Date.parse(data.serverTime) - Date.now();
  state.progress = new Map((data.activities || []).map((item) => [item.activityId, item]));
  renderActivities();
}

async function recordPortalVisit() {
  if (!state.client || !state.student) return;
  await invoke("open-activity", { entryId: portalEntryId, path: location.pathname + location.search });
}

async function restoreStudent() {
  if (!state.client) return;
  const { data } = await state.client.auth.getSession();
  if (!data.session) return;
  try {
    const result = await invoke("student-progress");
    if (result.student) {
      showStudent(result.student);
      if (result.serverTime) state.serverOffsetMs = Date.parse(result.serverTime) - Date.now();
      state.progress = new Map((result.activities || []).map((item) => [item.activityId, item]));
      await recordPortalVisit();
    }
  } catch (error) {
    if (error?.status !== 403) throw error;
  }
}

ui.search.addEventListener("input", renderActivities);
ui.change.addEventListener("click", async () => {
  if (state.client) await state.client.auth.signOut();
  state.student = null;
  state.progress.clear();
  ui.pill.hidden = true;
  ui.change.hidden = true;
  renderActivities();
  openStudentDialog();
});
document.querySelector("[data-close]").addEventListener("click", () => ui.dialog.close());
ui.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = ui.form.querySelector("button[type=submit]");
  const name = document.querySelector("#student-name").value.trim();
  const code = document.querySelector("#student-code").value.trim().toUpperCase();
  ui.error.hidden = true;
  button.disabled = true;
  button.textContent = "Проверяем…";
  try {
    await signInStudent(name, code);
    ui.dialog.close();
  } catch (error) {
    ui.error.textContent = error instanceof Error ? error.message : "Не удалось войти.";
    ui.error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Войти";
  }
});

async function init() {
  try {
    await loadCatalog();
    registerWebMcpTools();
    state.client = getSupabaseClient();
    await restoreStudent();
    renderFilters();
    renderActivities();
    window.setInterval(() => {
      if (state.student && [...state.progress.values()].some((item) => item.deadlineAt && !item.deadlineExpired)) renderActivities();
    }, 1000);
    if (!state.student) openStudentDialog();
  } catch (error) {
    const panel = document.createElement("div");
    panel.className = "empty-panel";
    panel.textContent = error instanceof Error ? error.message : "Не удалось открыть портал.";
    ui.grid.replaceChildren(panel);
  }
}

void init();
