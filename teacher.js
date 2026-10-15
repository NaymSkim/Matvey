import { APP_CONFIG, getSupabaseClient, invokeFunction } from "./supabase-client.js";
import { parsePracticeEvent, summarizeIndependent, summarizePractice, summarizeStandalone } from "./practice-stats.js";

const ui = {
  login: document.querySelector("#teacher-login"), dashboard: document.querySelector("#teacher-dashboard"),
  loginForm: document.querySelector("#teacher-login-form"), loginMessage: document.querySelector("#teacher-login-message"),
  signout: document.querySelector("#teacher-signout"), refresh: document.querySelector("#refresh-dashboard"),
  meta: document.querySelector("#dashboard-meta"), summaries: document.querySelector("#summary-cards"),
  activityAccess: document.querySelector("#activity-access-list"),
  studentAdmin: document.querySelector("#student-admin"), results: document.querySelector("#results-body"),
  attempts: document.querySelector("#attempts-body"), noResults: document.querySelector("#no-results"),
  practiceSummary: document.querySelector("#practice-summary"), practiceBody: document.querySelector("#practice-body"),
  practiceStatus: document.querySelector("#practice-status"), independentSummary: document.querySelector("#independent-summary"),
  frictionSummary: document.querySelector("#friction-summary"), frictionBody: document.querySelector("#friction-body"),
  frictionStatus: document.querySelector("#friction-status"),
  independentBody: document.querySelector("#independent-body"), independentStatus: document.querySelector("#independent-status"),
  standaloneBody: document.querySelector("#standalone-body"),
  adminDialog: document.querySelector("#student-admin-dialog"), adminForm: document.querySelector("#student-admin-form"),
  adminError: document.querySelector("#student-admin-error"), codeDialog: document.querySelector("#code-dialog"),
  dashboardTitle: document.querySelector("#teacher-dashboard-title"), accessCopy: document.querySelector("#activity-access-copy"),
  accessTitle: document.querySelector("#access-panel-title"),
  studentTitle: document.querySelector("#student-panel-title"), resultsTitle: document.querySelector("#results-panel-title"),
  attemptsTitle: document.querySelector("#attempts-panel-title"),
};
let client;
let catalog = [];
let previewStudentId = "";
let dashboardLoading = false;

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
const activityItem = (id) => catalog.find((item) => item.id === id);
const activityName = (id) => activityItem(id)?.title || id;
const activityOrder = (id) => activityItem(id)?.order ?? Number.MAX_SAFE_INTEGER;
const questionLabel = (id) => {
  const match = /^(?:v(\d+)-)?q(\d+)$/.exec(id || "");
  if (!match) return id || "Открыть вопрос";
  return `${match[1] ? `Вариант ${match[1]} · ` : ""}задание ${match[2]}`;
};
const activityHref = (id, questionId = "") => {
  const item = activityItem(id);
  if (!item?.url) return "./";
  const url = new URL(item.url, document.baseURI);
  url.searchParams.set("preview", "teacher");
  if (previewStudentId) url.searchParams.set("student", previewStudentId);
  if (item.verificationMode === "server-graded" && questionId) {
    url.searchParams.set("question", questionId);
    url.hash = `question-${questionId}`;
  }
  return url.href;
};
function activityLink(id, label = activityName(id), questionId = "") {
  const link = document.createElement("a");
  link.className = `teacher-task-link${questionId ? " question" : ""}`;
  link.href = activityHref(id, questionId);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = label;
  link.title = questionId ? `Открыть ${questionLabel(questionId)}` : "Открыть работу";
  return link;
}
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

function teacherLoginError(error) {
  const message = error instanceof Error ? error.message : "Не удалось отправить ссылку.";
  if (/signups not allowed for otp|otp[_ ]disabled/i.test(message)) {
    return "Эта почта ещё не подключена к кабинету преподавателя. Проверьте адрес или повторно выполните настройку преподавателя.";
  }
  return message;
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

function renderActivityAccess(settings, studentName = "") {
  ui.activityAccess.replaceChildren();
  [...settings].sort((a, b) => activityOrder(a.activityId) - activityOrder(b.activityId)).forEach((item) => {
    const row = document.createElement("article");
    row.className = "activity-access-row";
    const heading = document.createElement("div");
    heading.className = "activity-access-heading";
    const title = activityLink(item.activityId);
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
    checkbox.defaultChecked = checkbox.checked;
    const toggleText = document.createElement("span");
    toggleText.textContent = studentName ? `${studentName}: работа открыта` : "Открыта ученику";
    toggle.append(checkbox, toggleText);

    const deadlineLabel = document.createElement("label");
    deadlineLabel.className = "deadline-field";
    const deadlineText = document.createElement("span");
    deadlineText.textContent = "Выполнить до";
    const deadline = document.createElement("input");
    deadline.type = "datetime-local";
    deadline.value = localDateTimeValue(item.deadlineAt);
    deadline.defaultValue = deadline.value;
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

function renderResults(rows, student, standalone, practice, friction) {
  ui.results.replaceChildren();
  const standaloneById = new Map(standalone.works.map((work) => [`gromtseva-sr-${work.number}`, work]));
  [...rows].sort((a, b) => activityOrder(a.activityId) - activityOrder(b.activityId)).forEach((item) => {
    const activity = activityItem(item.activityId);
    const selfCheck = standaloneById.get(item.activityId);
    const tr = document.createElement("tr");
    const activityCell = document.createElement("td");
    activityCell.append(activityLink(item.activityId));
    tr.append(activityCell);
    const values = activity?.verificationMode === "visit-only" && selfCheck
      ? [`${selfCheck.visits} · ${date(selfCheck.lastAt || item.lastVisitAt)}`, `Вариант 1: ${selfCheck.solved[0]}/${selfCheck.number === 18 ? 4 : 3}`, `Вариант 2: ${selfCheck.solved[1]}/${selfCheck.number === 18 ? 4 : 3}`, `Без оценки · проверок: ${selfCheck.checks}`]
      : item.activityId === "free-fall-gravity"
        ? [`${practice.opens} · ${date(item.lastVisitAt)}`, "Без оценки", "—", `Решено: ${practice.solved}/30 · проверок: ${practice.checks}`]
        : item.activityId === "friction"
          ? [`${friction.opens} · ${date(item.lastVisitAt)}`, "Без оценки", "—", `Решено: ${friction.solved}/30 · проверок: ${friction.checks}`]
        : [`${item.visitCount} · ${date(item.lastVisitAt)}`, activity?.verificationMode === "visit-only" ? "Без оценки" : runsLabel(item.runs, 1), activity?.verificationMode === "visit-only" ? "—" : runsLabel(item.runs, 2), activity?.verificationMode === "visit-only" ? "Без оценки" : item.bestRun ? `${item.bestRun.variantId}: ${runLabel(item.bestRun)}` : "—"];
    values.forEach((value) => { const td = document.createElement("td"); td.textContent = value; tr.append(td); });
    const release = document.createElement("td");
    if (activity?.verificationMode === "visit-only") release.textContent = "—";
    else {
      const releaseButton = button(item.solutionsReleasedAt ? "Открыты" : "Открыть", "secondary-button", async () => {
        if (!student) return;
        await teacherAction("release_solutions", { studentId: student.id, activityId: item.activityId });
        await loadDashboard();
      });
      releaseButton.disabled = Boolean(item.solutionsReleasedAt);
      release.append(releaseButton);
    }
    tr.append(release); ui.results.append(tr);
  });
  ui.noResults.hidden = rows.length !== 0;
}

function practiceActivityId(event) {
  return event.source === "gravity" ? "free-fall-gravity" : event.source === "friction" ? "friction" : `gromtseva-${event.source}`;
}

function practiceQuestion(event) {
  if (event.kind !== "check") return "";
  const parts = event.task.split("-").map(Number);
  if (event.source === "gravity") {
    const topics = ["Свободное падение", "Всемирное тяготение", "Ускорение свободного падения"];
    return `${topics[parts[0] - 1]} · вариант ${parts[1]} · задание ${parts[2]}`;
  }
  if (event.source === "friction") {
    const topics = ["Покой и скольжение", "Движение и работа", "Олимпиадные задачи"];
    return `${topics[parts[0] - 1]} · вариант ${parts[1]} · задание ${parts[2]}`;
  }
  return `Вариант ${parts[0]} · задание ${parts[1]}`;
}

function practiceQuestionHref(activityId, event) {
  if (event.kind !== "check") return activityHref(activityId);
  const url = new URL(activityHref(activityId));
  url.hash = `task-${event.task}`;
  return url.href;
}

function recentActions(data) {
  const actions = [];
  for (const visit of data.visits || []) {
    const event = parsePracticeEvent({ path: visit.path, visited_at: visit.createdAt });
    if (event) {
      const activityId = visit.activityId || practiceActivityId(event);
      actions.push({ at: event.at, activityId, action: event.kind === "open" ? "Открыл работу" : "Проверил ответ", detail: event.kind === "open" ? "Самопроверка" : practiceQuestion(event), answer: event.answer, result: event.kind === "check" ? (event.correct ? "Верно" : "Неверно") : "", correct: event.kind === "check" ? event.correct : null, href: practiceQuestionHref(activityId, event) });
    } else if (visit.activityId) actions.push({ at: visit.createdAt, activityId: visit.activityId, action: "Открыл работу", detail: "Страница работы", result: "" });
  }
  for (const attempt of data.attempts || []) {
    actions.push({ at: attempt.createdAt, activityId: attempt.activityId, action: "Ответил", detail: questionLabel(attempt.questionId), questionId: attempt.questionId, answer: attempt.answerPreview, result: !attempt.graded ? "Открытый ответ" : attempt.correct ? `Верно · +${attempt.points}` : "Неверно", correct: attempt.graded ? attempt.correct : null });
  }
  for (const activity of data.activities || []) for (const run of activity.runs || []) {
    actions.push({ at: run.startedAt, activityId: activity.activityId, action: `Начал попытку ${run.runNo}`, detail: `Вариант ${run.variantId}`, result: "" });
    if (run.submittedAt) actions.push({ at: run.submittedAt, activityId: activity.activityId, action: `Сдал попытку ${run.runNo}`, detail: `Вариант ${run.variantId}`, result: runLabel(run), correct: run.grade == null ? null : run.grade >= 3 });
  }
  return actions.filter((item) => item.at).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function renderRecentActions(data) {
  ui.attempts.replaceChildren();
  recentActions(data).forEach((item) => {
    const tr = document.createElement("tr");
    const timeCell = document.createElement("td"); timeCell.textContent = date(item.at);
    const actionCell = document.createElement("td"); actionCell.textContent = item.action;
    const activityCell = document.createElement("td"); activityCell.append(activityLink(item.activityId));
    const detailCell = document.createElement("td");
    if (item.questionId) detailCell.append(activityLink(item.activityId, item.detail, item.questionId));
    else if (item.href) {
      const link = document.createElement("a"); link.className = "teacher-task-link question"; link.href = item.href; link.target = "_blank"; link.rel = "noopener"; link.textContent = item.detail; detailCell.append(link);
    } else detailCell.textContent = item.detail;
    const resultCell = document.createElement("td");
    resultCell.textContent = [item.answer ? `Ответ: ${item.answer}` : "", item.result].filter(Boolean).join(" · ") || "—";
    if (item.correct != null) resultCell.className = item.correct ? "result-ok" : "result-bad";
    tr.append(timeCell, actionCell, activityCell, detailCell, resultCell);
    ui.attempts.append(tr);
  });
  if (!ui.attempts.children.length) {
    const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 5; td.className = "empty-row"; td.textContent = "Действий пока нет."; tr.append(td); ui.attempts.append(tr);
  }
}

function renderPractice(stats, source = "gravity") {
  const summary = source === "friction" ? ui.frictionSummary : ui.practiceSummary;
  const body = source === "friction" ? ui.frictionBody : ui.practiceBody;
  const activityId = source === "friction" ? "friction" : "free-fall-gravity";
  summary.replaceChildren(
    summaryCard("Открытий", String(stats.opens)),
    summaryCard("Решено задач", `${stats.solved} / 30`),
    summaryCard("Проверок", String(stats.checks)),
    summaryCard("Ошибок", String(stats.errors)),
  );
  body.replaceChildren();
  const topics = source === "friction" ? ["Покой и скольжение", "Движение и работа", "Олимпиадные задачи"] : ["Свободное падение", "Всемирное тяготение", "Ускорение свободного падения"];
  stats.variants.forEach((group) => {
    const tr = document.createElement("tr");
    const topic = document.createElement("td");
    const link = activityLink(activityId, `${topics[group.work - 1]} · вариант ${group.variant}`);
    link.href = `${activityHref(activityId)}#variant-${group.work}-${group.variant}`;
    topic.append(link);
    tr.append(topic);
    [`${group.solved} / 5`, group.checks, group.errors, date(group.lastAt)].forEach((value) => {
      const cell = document.createElement("td"); cell.textContent = String(value); tr.append(cell);
    });
    body.append(tr);
  });
}

function renderIndependent(rows, attempts, standalone) {
  const works = summarizeIndependent(catalog, rows, attempts);
  const completed = works.filter((work) => work.status === "Сдана");
  const inProgress = works.filter((work) => work.status === "В работе");
  const graded = completed.filter((work) => work.bestRun?.grade != null);
  const grade = graded.length ? (graded.reduce((sum, work) => sum + work.bestRun.grade, 0) / graded.length).toFixed(1).replace(".0", "") : "—";
  ui.independentSummary.replaceChildren(
    summaryCard("Сдано", `${completed.length} / ${works.length}`),
    summaryCard("В работе", String(inProgress.length)),
    summaryCard("Средняя оценка", grade),
    summaryCard("Верных ответов", String(works.reduce((sum, work) => sum + work.correct, 0))),
    summaryCard("Прежние самопроверки", `${standalone.works.reduce((sum, work) => sum + work.solved[0] + work.solved[1], 0)} / 32`),
  );
  ui.independentBody.replaceChildren();
  works.forEach((work) => {
    const tr = document.createElement("tr");
    const title = document.createElement("td"); title.append(activityLink(work.id, work.title)); tr.append(title);
    [work.status, work.visits, `${work.correct} / ${work.checked}`, runLabel(work.bestRun), date(work.lastAt)].forEach((value) => {
      const cell = document.createElement("td"); cell.textContent = String(value); tr.append(cell);
    });
    ui.independentBody.append(tr);
  });
  ui.standaloneBody.replaceChildren();
  const titles = {
    14: "Свободное падение тел", 15: "Движение вверх и невесомость",
    16: "Всемирное тяготение", 17: "Ускорение свободного падения", 18: "Сила тяжести",
  };
  standalone.works.forEach((work) => {
    const tr = document.createElement("tr");
    const title = document.createElement("td");
    const link = document.createElement("a");
    link.className = "teacher-task-link";
    link.href = new URL(`tasks/gromtseva-sr-${work.number}.html`, document.baseURI).href;
    link.target = "_blank"; link.rel = "noopener";
    link.textContent = `СР № ${work.number} · ${titles[work.number]}`;
    title.append(link); tr.append(title);
    const total = work.number === 18 ? 4 : 3;
    [work.visits, `1: ${work.solved[0]}/${total} · 2: ${work.solved[1]}/${total}`, work.checks, work.errors, date(work.lastAt)].forEach((value) => {
      const cell = document.createElement("td"); cell.textContent = String(value); tr.append(cell);
    });
    ui.standaloneBody.append(tr);
  });
}

async function loadDashboard() {
  if (dashboardLoading) return;
  dashboardLoading = true;
  ui.refresh.disabled = true;
  try {
    const data = await invoke("teacher-summary");
    previewStudentId = data.student?.id || "";
    ui.login.hidden = true; ui.dashboard.hidden = false; ui.signout.hidden = false;
    const studentName = data.student?.name || "";
    document.title = studentName ? `${studentName} · Кабинет преподавателя` : "Кабинет преподавателя";
    ui.dashboardTitle.textContent = studentName ? `${studentName}: прогресс` : "Прогресс ученика";
    ui.accessTitle.textContent = studentName ? `${studentName}: доступ к работам` : "Доступ к работам";
    ui.accessCopy.textContent = studentName ? `${studentName}: откройте или закройте нужные работы. Срок указывается по вашему местному времени; когда он наступит, новые ответы перестанут приниматься.` : "Откройте или закройте работу для ученика. Срок указывается по вашему местному времени; когда он наступит, новые ответы перестанут приниматься.";
    ui.studentTitle.textContent = studentName ? `Ученик: ${studentName}` : "Ученик";
    ui.resultsTitle.textContent = studentName ? `${studentName}: результаты работ` : "Результаты работ";
    ui.attemptsTitle.textContent = studentName ? `${studentName}: последние действия` : "Последние действия";
    ui.noResults.textContent = studentName ? `${studentName} пока не сдавал работы.` : "Результатов пока нет.";
    ui.meta.textContent = `Обновлено ${date(new Date().toISOString())}`;
    const eventRows = (data.visits || []).map((item) => ({ path: item.path, visited_at: item.createdAt }));
    const practice = summarizePractice(eventRows);
    const friction = summarizePractice(eventRows, "friction");
    const standalone = summarizeStandalone(eventRows);
    ui.practiceStatus.textContent = data.student
      ? practice.checks ? "Все проверки синхронизированы с журналом." : "Проверок пока нет. Ученик должен войти в портал перед решением."
      : "Статистика появится после создания ученика.";
    ui.frictionStatus.textContent = data.student
      ? friction.checks ? "Все проверки синхронизированы с журналом." : "Проверок пока нет. Ученик должен войти в портал перед решением."
      : "Статистика появится после создания ученика.";
    ui.independentStatus.textContent = "";
    const visitCount = (data.visits || []).filter((item) => parsePracticeEvent({ path: item.path, visited_at: item.createdAt })?.kind !== "check").length;
    ui.summaries.replaceChildren(
      summaryCard("Ученик", studentName || "—"),
      summaryCard("Посещений", String(visitCount)),
      summaryCard("Сдано работ", String(data.submittedRuns || 0)),
      summaryCard("Средняя оценка", data.averageGrade ? String(data.averageGrade) : "—"),
    );
    renderPractice(practice); renderPractice(friction, "friction"); renderIndependent(data.activities || [], data.attempts || [], standalone);
    renderActivityAccess(data.activitySettings || [], studentName); renderStudent(data.student); renderResults(data.activities || [], data.student, standalone, practice, friction); renderRecentActions(data);
  } finally { ui.refresh.disabled = false; dashboardLoading = false; }
}

ui.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const buttonElement = ui.loginForm.querySelector("button");
  buttonElement.disabled = true;
  try {
    if (!client) throw new Error("Кабинет временно недоступен. Попробуйте немного позже.");
    const email = document.querySelector("#teacher-email").value.trim();
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: APP_CONFIG.teacherRedirectUrl } });
    if (error) throw error;
    ui.loginMessage.textContent = "Мы отправили письмо. Откройте ссылку в этом браузере.";
    ui.loginMessage.className = "notice success"; ui.loginMessage.hidden = false;
  } catch (error) {
    ui.loginMessage.textContent = teacherLoginError(error);
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

function hasUnsavedScheduleChanges() {
  return [...ui.activityAccess.querySelectorAll("input")].some((input) => input.type === "checkbox"
    ? input.checked !== input.defaultChecked : input.value !== input.defaultValue);
}

setInterval(() => {
  if (!document.hidden && !ui.dashboard.hidden && !hasUnsavedScheduleChanges()) void loadDashboard().catch(() => {});
}, 30_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !ui.dashboard.hidden && !hasUnsavedScheduleChanges()) void loadDashboard().catch(() => {});
});

void init();
