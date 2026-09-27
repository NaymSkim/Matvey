import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !secret) throw new Error("Укажите SUPABASE_URL и SUPABASE_SECRET_KEY.");

const headers = {
  apikey: secret,
  "Content-Type": "application/json",
};
async function synchronize(activities, answers) {
  const response = await fetch(`${url}/rest/v1/rpc/sync_portal_content`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_activities: activities, p_answers: answers }),
  });
  if (!response.ok) throw new Error(`sync_portal_content: ${response.status} ${await response.text()}`);
  return response.json();
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "activities.json"), "utf8"));
const activities = catalog.activities.map((item) => ({
  id: item.id,
  title: item.title,
  verification_mode: item.verificationMode,
  grade_thresholds: item.gradeThresholds,
  active: Boolean(item.published),
}));

if (process.argv.includes("--catalog-only")) {
  const result = await synchronize(activities, null);
  console.log(`Каталог синхронизирован: ${result.activities} активных работ.`);
  process.exit(0);
}

const privatePath = path.join(root, "answers.private.json");
if (!fs.existsSync(privatePath)) throw new Error("Нет answers.private.json. Сначала выполните pnpm run content.");
const privateData = JSON.parse(fs.readFileSync(privatePath, "utf8"));
const keys = privateData.activities.flatMap((activity) => activity.answers.map((answer) => ({
  activity_id: activity.id,
  variant_id: answer.variantId,
  question_id: answer.questionId,
  matcher_type: answer.matcherType,
  expected_json: answer.expected,
  tolerance: answer.tolerance || 0,
  points: answer.points,
  solution_html: answer.solutionHtml || "",
})));
const result = await synchronize(activities, keys);
console.log(`Синхронизировано атомарно: ${result.activities} работ, ${result.answers} закрытых ключей.`);
