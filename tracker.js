import { getSupabaseClient, invokeFunction, PortalRequestError } from "./supabase-client.js";

const PENDING_KEY = "physics-portal-pending-v1";
const FAILED_KEY = "physics-portal-failed-v1";

async function invoke(name, body = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new PortalRequestError("Портал временно недоступен. Попробуйте немного позже.");
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Сначала войдите на главной странице портала.");
  return invokeFunction(name, body);
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); }
  catch { return []; }
}

function writeQueue(queue) { localStorage.setItem(PENDING_KEY, JSON.stringify(queue)); }

function readFailed() {
  try { return JSON.parse(localStorage.getItem(FAILED_KEY) || "[]"); }
  catch { return []; }
}

function writeFailed(entries) {
  if (entries.length) localStorage.setItem(FAILED_KEY, JSON.stringify(entries));
  else localStorage.removeItem(FAILED_KEY);
}

function clearFailed(runId, questionId) {
  writeFailed(readFailed().filter((item) => item.entry?.runId !== runId || item.entry?.questionId !== questionId));
}

function discardPending(runId) {
  writeQueue(readQueue().filter((item) => item.runId !== runId));
  writeFailed(readFailed().filter((item) => item.entry?.runId !== runId));
}

async function flushPending(runId = null) {
  const queue = readQueue();
  const remaining = [];
  const failed = readFailed();
  for (const entry of queue) {
    try {
      await invoke("submit-answer", entry);
      for (let index = failed.length - 1; index >= 0; index -= 1) {
        if (failed[index].entry?.runId === entry.runId && failed[index].entry?.questionId === entry.questionId) failed.splice(index, 1);
      }
    }
    catch (error) {
      if (error instanceof PortalRequestError && error.transient) remaining.push(entry);
      else if (!failed.some((item) => item.entry?.attemptId === entry.attemptId)) failed.push({ entry, reason: error instanceof Error ? error.message : "Ответ не удалось сохранить." });
    }
  }
  writeQueue(remaining);
  writeFailed(failed);
  const relevantFailed = runId ? failed.filter((item) => item.entry?.runId === runId).length : failed.length;
  return { sent: queue.length - remaining.length, pending: remaining.length, failed: relevantFailed };
}

async function submitAnswer(runId, questionId, answer, attemptId = crypto.randomUUID()) {
  const payload = { runId, questionId, answer, attemptId };
  try {
    const result = await invoke("submit-answer", payload);
    clearFailed(runId, questionId);
    return result;
  }
  catch (error) {
    if (error instanceof PortalRequestError && error.transient) {
      const queue = readQueue();
      if (!queue.some((item) => item.attemptId === attemptId)) queue.push(payload);
      writeQueue(queue);
      return { queued: true, attemptId };
    }
    throw error;
  }
}

export const PhysicsTracker = {
  openActivity: (activityId, entryId = crypto.randomUUID()) => invoke("open-activity", { activityId, entryId, path: location.pathname + location.search }),
  startRun: (activityId, variantId = "default") => invoke("start-run", { activityId, variantId }),
  submitAnswer,
  submitRun: (runId) => invoke("submit-run", { runId }),
  loadProgress: (activityId) => invoke("student-progress", activityId ? { activityId } : {}),
  loadReleasedSolutions: (activityId, variantId = "default") => invoke("released-solutions", { activityId, variantId }),
  loadTeacherAnswers: (activityId, studentId = "") => invoke("teacher-answers", { activityId, ...(studentId ? { studentId } : {}) }),
  flushPending,
  discardPending,
};

window.addEventListener("online", () => void flushPending());
window.PhysicsTracker = PhysicsTracker;
