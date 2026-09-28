import { getSupabaseClient, invokeFunction } from "./supabase-client.js";

async function personalizeGames() {
  const client = getSupabaseClient();
  if (!client) return;
  const { data } = await client.auth.getSession();
  if (!data.session) return;
  try {
    const progress = await invokeFunction("student-progress");
    const name = progress.student?.name;
    if (!name) return;
    document.title = `${name} · Игры по физике`;
    const pill = document.querySelector("#games-student");
    pill.textContent = name;
    pill.hidden = false;
    document.querySelector("#games-title").textContent = `${name}, выбирай игру`;
    document.querySelector("#games-lead").textContent = `${name}, здесь можно экспериментировать с физикой, запускать механизмы и решать головоломки без оценок.`;
  } catch (_) {
    // Игры остаются доступными и без активного входа ученика.
  }
}

void personalizeGames();
