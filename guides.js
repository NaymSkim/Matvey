import { getSupabaseClient, invokeFunction } from "./supabase-client.js";

async function personalizeGuides() {
  const client = getSupabaseClient();
  if (!client) return;
  const { data } = await client.auth.getSession();
  if (!data.session) return;
  try {
    const progress = await invokeFunction("student-progress");
    const name = progress.student?.name;
    if (!name) return;
    document.title = `${name} · Памятки по физике`;
    const pill = document.querySelector("#guide-student");
    pill.textContent = name;
    pill.hidden = false;
    document.querySelector("#guide-title").textContent = `${name}, памятки для тебя`;
    document.querySelector("#guide-lead").textContent = `${name}, здесь собраны короткие материалы для повторения перед уроком, работой или экзаменом.`;
  } catch (_) {
    // Памятки остаются доступными и без активного входа ученика.
  }
}

void personalizeGuides();
