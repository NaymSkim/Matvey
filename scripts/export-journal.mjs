import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !secret) throw new Error("Укажите SUPABASE_URL и SUPABASE_SECRET_KEY.");
const headers = { apikey: secret };
async function rows(table, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
  return response.json();
}
const [students, runs] = await Promise.all([
  rows("students", "select=id,display_name"),
  rows("activity_runs", "select=student_id,activity_id,variant_id,run_no,status,score,max_points,percent,grade,started_at,submitted_at&order=started_at.asc"),
]);
const names = new Map(students.map((student) => [student.id, student.display_name]));
const fields = ["Ученик", "Работа", "Вариант", "Сдача", "Статус", "Баллы", "Максимум", "Процент", "Оценка", "Начата", "Сдана"];
const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const lines = [fields, ...runs.map((run) => [names.get(run.student_id) || run.student_id, run.activity_id, run.variant_id, run.run_no, run.status, run.score, run.max_points, run.percent, run.grade, run.started_at, run.submitted_at])].map((row) => row.map(quote).join(","));
const exportDir = path.join(root, "exports");
fs.mkdirSync(exportDir, { recursive: true });
const file = path.join(exportDir, `journal-${new Date().toISOString().slice(0, 10)}.csv`);
fs.writeFileSync(file, `\uFEFF${lines.join("\n")}\n`);
console.log(`Журнал сохранён: ${file}`);
