import { PhysicsTracker } from "./tracker.js";

const status = document.querySelector("#teacher-stats-status");
const earlyChecks = window.practiceChecksBeforeLogin || [];
const standaloneMatch = /\/tasks\/gromtseva-sr-(1[4-9]|2[0-3])\.html$/.exec(location.pathname);
const standalone = Boolean(standaloneMatch);
const activityId = standalone ? `gromtseva-sr-${standaloneMatch[1]}`
  : location.pathname.endsWith("/tasks/friction.html") ? "friction" : "free-fall-gravity";

const target = /^#task-([1-3])-([1-2])-([1-5])$|^#task-([1-2])-([1-4])$/.exec(location.hash);
const variantTarget = /^#variant-([1-3])-([1-2])$/.exec(location.hash);
if (target || variantTarget) {
  const work = standalone ? null : Number((target || variantTarget)[1]);
  const variant = standalone ? Number(target?.[4]) : Number((target || variantTarget)[2]);
  if (!standalone) document.querySelector(`[data-work="${work}"]`)?.click();
  document.querySelector(`[data-variant="${standalone ? variant : `${work}-${variant}`}"]`)?.click();
  requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
}

function lockActivity(message) {
  status.textContent = message;
  status.style.color = "#a33a2b";
  document.querySelectorAll("input, textarea, select, button").forEach((control) => { control.disabled = true; });
}

try {
  const progress = await PhysicsTracker.loadProgress(activityId);
  const studentId = progress.student?.id;
  if (!studentId) throw new Error("Ученик не выбран.");
  const access = progress.activities?.find((item) => item.activityId === activityId);
  // A new self-check page can record visits before its catalog row is synced.
  // The path still identifies the activity for the teacher's practice summary.
  const trackingActivityId = activityId === "friction" && !access ? null : activityId;
  if (access && !access.isOpen) {
    lockActivity(access.manuallyClosed ? "Работа закрыта преподавателем" : "Время выполнения работы истекло");
    throw new Error("ACTIVITY_CLOSED");
  }

  const queueKey = `physics-practice-events-v1-${studentId}`;
  let queue;
  try {
    const saved = JSON.parse(localStorage.getItem(queueKey) || "[]");
    queue = Array.isArray(saved) ? saved : [];
  } catch { queue = []; }
  let sending = false;

  function saveQueue() {
    if (queue.length) localStorage.setItem(queueKey, JSON.stringify(queue));
    else localStorage.removeItem(queueKey);
  }

  function enqueue(kind, task = "", correct = false, answer = "", entryId = crypto.randomUUID()) {
    const query = new URLSearchParams({ practice: kind });
    if (kind === "check") {
      query.set("task", task);
      query.set("correct", correct ? "1" : "0");
      if (answer) query.set("answer", answer.slice(0, 120));
    }
    queue.push({ id: entryId, path: `${location.pathname}?${query}` });
    saveQueue();
    void flush();
  }

  async function flush() {
    if (sending) return;
    sending = true;
    try {
      while (queue.length) {
        const event = queue[0];
        await PhysicsTracker.openActivity(trackingActivityId, event.id, event.path);
        queue.shift();
        saveQueue();
      }
      status.textContent = "Проверки видны преподавателю ✓";
    } catch (error) {
      if (error?.status === 403) lockActivity(error.message || "Работа закрыта преподавателем");
      else status.textContent = "Проверки ждут отправки преподавателю";
    } finally { sending = false; }
  }

  window.recordPracticeAttempt = (...entry) => {
    const task = standalone ? `${entry[0]}-${entry[1]}` : `${entry[0]}-${entry[1]}-${entry[2]}`;
    const correct = standalone ? entry[2] : entry[3];
    const control = standalone
      ? document.querySelector(`#answer-${task}`)
      : document.querySelector(`#w${entry[0]}v${entry[1]}q${entry[2]}`);
    const selected = standalone ? null : document.querySelector(`input[name="w${entry[0]}v${entry[1]}q${entry[2]}"]:checked`);
    enqueue("check", task, correct, (selected?.value || control?.value || "").trim());
  };
  const portalEntryKey = `physics-entry:${activityId}`;
  const portalEntryId = sessionStorage.getItem(portalEntryKey);
  sessionStorage.removeItem(portalEntryKey);
  enqueue("open", "", false, "", portalEntryId || crypto.randomUUID());
  earlyChecks.forEach((entry) => window.recordPracticeAttempt(...entry));
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void flush(); });
  setInterval(async () => {
    if (document.hidden) return;
    try {
      const current = await PhysicsTracker.loadProgress(activityId);
      const latest = current.activities?.find((item) => item.activityId === activityId);
      if (latest && !latest.isOpen) lockActivity(latest.manuallyClosed ? "Работа закрыта преподавателем" : "Время выполнения работы истекло");
    } catch { /* Периодическая проверка повторится при следующем обновлении. */ }
  }, 30_000);
} catch (error) {
  if (error instanceof Error && error.message === "ACTIVITY_CLOSED") {
    // Сообщение уже показано; закрытая работа не отправляет новые события.
  } else status.textContent = "Для статистики войди в портал как ученик";
}
