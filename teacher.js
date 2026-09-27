import { APP_CONFIG, getSupabaseClient, invokeFunction } from "./supabase-client.js";

const ui = {
  login: document.querySelector("#teacher-login"), dashboard: document.querySelector("#teacher-dashboard"),
  loginForm: document.querySelector("#teacher-login-form"), loginMessage: document.querySelector("#teacher-login-message"),
  signout: document.querySelector("#teacher-signout"), refresh: document.querySelector("#refresh-dashboard"),
  meta: document.querySelector("#dashboard-meta"), summaries: document.querySelector("#summary-cards"),
  activityAccess: document.querySelector("#activity-access-list"),
  studentAdmin: document.querySelector("#student-admin"), results: document.querySelector("#results-body"),
  attempts: document.querySelector("#attempts-body"), noResults: document.querySelector("#no-results"),
  adminDialog: document.querySelector("#student-admin-dialog"), adminForm: document.querySelector("#student-admin-form"),
  adminError: document.querySelector("#student-admin-error"), codeDialog: document.querySelector("#code-dialog"),
};
let client;
let catalog = [];

async function invoke(name, body = {}) {
  return invokeFunction(name, body);
}

const date = (value) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const localDateTimeValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
const activityName = (id) => catalog.find((item) => item.id === id)?.title || id;
const runLabel = (run) => run ? (run.grade == null ? "Ответы сохранены · без оценки" : `${run.score}/${run.maxPoints} · ${run.percent}% · ${run.grade}`) : "—";
const runsLabel = (runs, runNo) => {
  const selected = runs.filter((run) => run.runNo === runNo);
  return selected.length ? selected.map((run) => `${run.variantId}: ${runLabel(run)}`).join("; ") : "—";
};

function summaryCard(label, value) {
  const article = document.createElement("article");
  article.className = "summary-card";
  const small = document.createElement("span"); small.textContent = label;
  const strong = document.createElement("strong"); strong.textContent = value;
  article.append(small, strong); return article;
}

function button(label, className, action) {
  const element = document.createElement("button");
  element.type = "button"; element.className = className; element.textContent = label;
  element.addEventListener("click", async () => {
    element.disabled = true;
    try { await action(); }
    catch (error) { alert(error instanceof Error ? error.message : "Не удалось выполнить действие."); }
    finally { element.disabled = false; }
  });
  return element;
}

async function teacherAction(action, payload = {}) {
  return invoke("teacher-admin", { action, ...payload });
}

function showCode(name, code) {
  document.querySelector("#code-student-name").textContent = name;
  document.querySelector("#student-code-output").textContent = code;
  ui.codeDialog.showModal();
}

function renderStudent(student) {
  ui.studentAdmin.replaceChildren();
  const newStudentButton = document.querySelector("#new-student");
  newStudentButton.disabled = Boolean(student);
  newStudentButton.title = student ? "В первой версии используется один ученик" : "";
  if (!student) {
    const empty = document.createElement("p"); empty.className = "empty-row"; empty.textContent = "Ученик ещё не создан.";
    ui.studentAdmin.append(empty); return;
  }
  const row = document.createElement("div"); row.className = "student-admin-row";
  const details = document.createElement("div");
  const name = document.createElement("strong"); name.textContent = student.name;
  const meta = document.createElement("span"); meta.textContent = `Создан ${date(student.createdAt)} · устройств: ${student.deviceCount}`;
  details.append(name, meta);
  const actions = document.createElement("div"); actions.className = "row-actions";
  actions.append(
    button("Новый код", "secondary-button", async () => { const result = await teacherAction("reset_code", { studentId: student.id }); showCode(student.name, result.code); await loadDashboard(); }),
    button("Удалить", "danger-button", async () => { if (!confirm(`Удалить ученика «${student.name}» и все результаты?`)) return; await teacherAction("delete_student", { studentId: student.id }); await loadDashboard(); }),
  );
  row.append(details, actions); ui.studentAdmin.append(row);
}

function renderActivityAccess(settings) {
  ui.activityAccess.replaceChildren();
  settings.forEach((item) => {
    const row = document.createElement("article");
    row.className = "activity-access-row";
    const heading = document.createElement("div");
    heading.className = "activity-access-heading";
    const title = document.createElement("strong");
    title.textContent = activityName(item.activityId);
    const status = document.createElement("span");
    status.className = `access-status ${item.isOpen ? "open" : "closed"}`;
    status.textContent = item.manuallyClosed ? "Закрыта" : item.deadlineExpired ? "Срок истёк" : "Открыта";
    heading.append(title, status);

    const controls = document.createElement("div");
    controls.className = "activity-access-controls";
    const toggle = document.createElement("label");
    toggle.className = "access-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !item.manuallyClosed;
    const toggleText = document.createElement("span");
    toggleText.textContent = "Открыта ученику";
    toggle.append(checkbox, toggleText);

    const deadlineLabel = document.createElement("label");
    deadlineLabel.className = "deadline-field";
    const deadlineText = document.createElement("span");
    deadlineText.textContent = "Выполнить до";
    const deadline = document.createElement("input");
    deadline.type = "datetime-local";
    deadline.value = localDateTimeValue(item.deadlineAt);
    deadlineLabel.append(deadlineText, deadline);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const save = button("Сохранить", "primary-button compact", async () => {
      const deadlineAt = deadline.value ? new Date(deadline.value).toISOString() : null;
      await teacherAction("set_activity_access", { activityId: item.activityId, isOpen: checkbox.checked, deadlineAt });
      await loadDashboard();
    });
    const clear = button("Убрать срок", "secondary-button", async () => {
      await teacherAction("set_activity_access", { activityId: item.activityId, isOpen: checkbox.checked, deadlineAt: null });
      await loadDashboard();
    });
    clear.disabled = !item.deadlineAt;
    actions.append(save, clear);
    controls.append(toggle, deadlineLabel, actions);
    row.append(heading, controls);
    ui.activityAccess.append(row);
  });
}

function renderResults(rows, student) {
  ui.results.replaceChildren();
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    const values = [activityName(item.activityId), `${item.visitCount} · ${date(item.lastVisitAt)}`, runsLabel(item.runs, 1), runsLabel(item.runs, 2), item.bestRun ? `${item.bestRun.variantId}: ${runLabel(item.bestRun)}` : "—"];
    values.forEach((value) => { const td = document.createElement("td"); td.textContent = value; tr.append(td); });
    const release = document.createElement("td");
    const releaseButton = button(item.solutionsReleasedAt ? "Открыты" : "Открыть", "secondary-button", async () => {
      if (!student) return;
      await teacherAction("release_solutions", { studentId: student.id, activityId: item.activityId });
      await loadDashboard();
    });
    releaseButton.disabled = Boolean(item.solutionsReleasedAt);
    release.append(releaseButton); tr.append(release); ui.results.append(tr);
  });
  ui.noResults.hidden = rows.length !== 0;
}

function renderAttempts(attempts) {
  ui.attempts.replaceChildren();
  attempts.forEach((item) => {
    const tr = document.createElement("tr");
    const values = [date(item.createdAt), activityName(item.activityId), item.questionId, item.answerPreview, !item.graded ? "Открытый ответ" : item.correct ? `Верно · +${item.points}` : "Неверно"];
    values.forEach((value, index) => { const td = document.createElement("td"); td.textContent = value; if (index === 4 && item.graded) td.className = item.correct ? "result-ok" : "result-bad"; tr.append(td); });
    ui.attempts.append(tr);
  });
}

async function loadDashboard() {
  ui.refresh.disabled = true;
  try {
    const data = await invoke("teacher-summary");
    ui.login.hidden = true; ui.dashboard.hidden = false; ui.signout.hidden = false;
    ui.meta.textContent = `Обновлено ${date(new Date().toISOString())}`;
    ui.summaries.replaceChildren(
      summaryCard("Учеников", String(data.studentCount || 0)),
      summaryCard("Посещений", String(data.totalVisits || 0)),
      summaryCard("Сдано работ", String(data.submittedRuns || 0)),
      summaryCard("Средняя оценка", data.averageGrade ? String(data.averageGrade) : "—"),
    );
    renderActivityAccess(data.activitySettings || []); renderStudent(data.student); renderResults(data.activities || [], data.student); renderAttempts(data.attempts || []);
  } finally { ui.refresh.disabled = false; }
}

ui.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const buttonElement = ui.loginForm.querySelector("button");
  buttonElement.disabled = true;
  try {
    if (!client) throw new Error("Сначала подключите Supabase в config.js.");
    const email = document.querySelector("#teacher-email").value.trim();
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: APP_CONFIG.teacherRedirectUrl } });
    if (error) throw error;
    ui.loginMessage.textContent = "Письмо отправлено. Откройте ссылку в этом браузере.";
    ui.loginMessage.className = "notice success"; ui.loginMessage.hidden = false;
  } catch (error) {
    ui.loginMessage.textContent = error instanceof Error ? error.message : "Не удалось отправить ссылку.";
    ui.loginMessage.className = "notice"; ui.loginMessage.hidden = false;
  } finally { buttonElement.disabled = false; }
});

ui.signout.addEventListener("click", async () => {
  ui.signout.disabled = true;
  try { await client?.auth.signOut(); location.reload(); }
  catch (error) { alert(error instanceof Error ? error.message : "Не удалось выйти."); ui.signout.disabled = false; }
});
ui.refresh.addEventListener("click", () => loadDashboard().catch((error) => alert(error.message)));
document.querySelector("#new-student").addEventListener("click", () => ui.adminDialog.showModal());
document.querySelector("[data-close-admin]").addEventListener("click", () => ui.adminDialog.close());
document.querySelectorAll("[data-close-code]").forEach((element) => element.addEventListener("click", () => ui.codeDialog.close()));
ui.codeDialog.addEventListener("close", () => { document.querySelector("#student-code-output").textContent = ""; });
ui.adminForm.addEventListener("submit", async (event) => {
  event.preventDefault(); ui.adminError.hidden = true;
  const submit = ui.adminForm.querySelector("button[type=submit]"); submit.disabled = true;
  try {
    const result = await teacherAction("create_student", { name: document.querySelector("#new-student-name").value.trim() });
    ui.adminDialog.close(); showCode(result.student.name, result.code); ui.adminForm.reset(); await loadDashboard();
  } catch (error) { ui.adminError.textContent = error.message; ui.adminError.hidden = false; }
  finally { submit.disabled = false; }
});

async function init() {
  const response = await fetch("data/activities.json", { cache: "no-store" });
  catalog = (await response.json()).activities;
  client = getSupabaseClient();
  if (!client) return;
  const { data } = await client.auth.getSession();
  if (data.session && !data.session.user.is_anonymous) {
    try { await loadDashboard(); }
    catch (error) { ui.loginMessage.textContent = error.message; ui.loginMessage.hidden = false; }
  }
}

void init();
