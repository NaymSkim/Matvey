import { PhysicsTracker } from "../../tracker.js";

const activityId = "impulse-work";
const status = document.querySelector("#teacher-stats-status");
const earlyChecks = window.impulseWorkChecksBeforeLogin || [];

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}

function lockActivity(text) {
  window.impulseWorkLocked = true;
  message(text, true);
  document.querySelectorAll(".task-card input, .task-card select, .task-card button[data-action='check']")
    .forEach((control) => { control.disabled = true; });
}

if (new URLSearchParams(location.search).get("preview") === "teacher") {
  window.recordImpulseWorkAttempt = () => {};
  message("Просмотр преподавателя. Попытки ученика доступны в журнале Matvey.");
} else try {
  const progress = await PhysicsTracker.loadProgress(activityId);
  if (!progress.student?.id) throw new Error("Ученик не выбран.");
  const access = progress.activities?.find((item) => item.activityId === activityId);
  if (!access) throw new Error("Тренировка ещё не подключена к журналу.");
  if (!access.isOpen) {
    lockActivity(access.manuallyClosed ? "Тренировка закрыта преподавателем." : "Время тренировки истекло.");
    throw new Error("ACTIVITY_CLOSED");
  }

  const queueKey = `physics-impulse-work-events-v1-${progress.student.id}`;
  let queue;
  try {
    const saved = JSON.parse(localStorage.getItem(queueKey) || "[]");
    queue = Array.isArray(saved) ? saved : [];
  } catch { queue = []; }
  let sending = false;

  function saveQueue() {
    try {
      if (queue.length) localStorage.setItem(queueKey, JSON.stringify(queue));
      else localStorage.removeItem(queueKey);
    } catch { message("Проверки пока хранятся только на этом устройстве.", true); }
  }

  function enqueue(kind, task = "", stage = "", correct = false, answer = "") {
    const query = new URLSearchParams({ practice: kind });
    if (kind === "check") {
      query.set("task", task);
      query.set("stage", stage);
      query.set("correct", correct ? "1" : "0");
      query.set("answer", String(answer).trim().slice(0, 60));
    }
    queue.push({ id: crypto.randomUUID(), path: `${location.pathname}?${query}` });
    saveQueue();
    void flush();
  }

  async function flush() {
    if (sending) return;
    sending = true;
    try {
      while (queue.length) {
        const event = queue[0];
        await PhysicsTracker.openActivity(activityId, event.id, event.path);
        queue.shift();
        saveQueue();
      }
      message("Проверки видны преподавателю ✓");
    } catch (error) {
      if (error?.status === 403) lockActivity(error.message || "Тренировка закрыта преподавателем.");
      else message("Проверки ждут отправки преподавателю.", true);
    } finally { sending = false; }
  }

  window.recordImpulseWorkAttempt = (task, stage, correct, answer) => enqueue("check", task, stage, correct, answer);
  const portalEntryKey = `physics-entry:${activityId}`;
  const portalEntryId = sessionStorage.getItem(portalEntryKey);
  sessionStorage.removeItem(portalEntryKey);
  if (!portalEntryId) enqueue("open");
  earlyChecks.forEach((entry) => window.recordImpulseWorkAttempt(...entry));
  earlyChecks.length = 0;
  void flush();
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void flush(); });
  setInterval(async () => {
    if (document.hidden) return;
    try {
      const current = await PhysicsTracker.loadProgress(activityId);
      const latest = current.activities?.find((item) => item.activityId === activityId);
      if (latest && !latest.isOpen) lockActivity(latest.manuallyClosed ? "Тренировка закрыта преподавателем." : "Время тренировки истекло.");
    } catch { /* Повторим проверку доступа позже. */ }
  }, 30_000);
} catch (error) {
  if (error instanceof Error && error.message !== "ACTIVITY_CLOSED") {
    message("Для журнала войди в Matvey как ученик. Самопроверка доступна и без входа.", true);
    window.recordImpulseWorkAttempt = () => {};
    earlyChecks.length = 0;
  }
}
