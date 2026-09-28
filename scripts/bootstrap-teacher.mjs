const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const email = (process.env.TEACHER_EMAIL || "").trim().toLowerCase();
if (!url || !secret || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Укажите SUPABASE_URL, SUPABASE_SECRET_KEY и TEACHER_EMAIL.");
const headers = { apikey: secret, "Content-Type": "application/json" };

let response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
if (!response.ok) throw new Error(`Не удалось прочитать пользователей: ${response.status} ${await response.text()}`);
let user = (await response.json()).users.find((item) => item.email?.toLowerCase() === email);
if (!user) {
  response = await fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, email_confirm: true }) });
  if (!response.ok) throw new Error(`Не удалось создать преподавателя: ${response.status} ${await response.text()}`);
  user = await response.json();
} else if (!user.email_confirmed_at) {
  response = await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers, body: JSON.stringify({ email_confirm: true }) });
  if (!response.ok) throw new Error(`Не удалось подтвердить почту преподавателя: ${response.status} ${await response.text()}`);
  user = await response.json();
}
response = await fetch(`${url}/rest/v1/teachers?on_conflict=auth_user_id`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify([{ auth_user_id: user.id, email }]),
});
if (!response.ok) throw new Error(`Не удалось назначить преподавателя: ${response.status} ${await response.text()}`);
console.log(`Преподаватель готов: ${email}`);
