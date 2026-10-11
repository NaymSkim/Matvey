import { PhysicsTracker } from "./tracker.js";

const status = document.querySelector("#teacher-stats-status");
const earlyChecks = window.practiceChecksBeforeLogin || [];
const standalone = /\/tasks\/gromtseva-sr-(?:14|15|16|17|18)\.html$/.test(location.pathname);

try {
  const progress = await PhysicsTracker.loadProgress();
  const studentId = progress.student?.id;
  if (!studentId) throw new Error("Ученик не выбран.");

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

  function enqueue(kind, task = "", correct = false) {
    const query = new URLSearchParams({ practice: kind });
    if (kind === "check") {
      query.set("task", task);
      query.set("correct", correct ? "1" : "0");
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
        await PhysicsTracker.openActivity(null, event.id, event.path);
        queue.shift();
        saveQueue();
      }
      status.textContent = "Проверки видны преподавателю ✓";
    } catch {
      status.textContent = "Проверки ждут отправки преподавателю";
    } finally { sending = false; }
  }

  window.recordPracticeAttempt = (...entry) => {
    const task = standalone ? `${entry[0]}-${entry[1]}` : `${entry[0]}-${entry[1]}-${entry[2]}`;
    const correct = standalone ? entry[2] : entry[3];
    enqueue("check", task, correct);
  };
  enqueue("open");
  earlyChecks.forEach((entry) => window.recordPracticeAttempt(...entry));
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void flush(); });
} catch {
  status.textContent = "Для статистики войди в портал как ученик";
}
