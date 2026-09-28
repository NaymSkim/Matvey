import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenFiles = ["answers.private.json", ".env", ".env.local"];
const publicFiles = ["index.html", "guides.html", "games.html", "teacher.html", "task.html", "portal.js", "guides.js", "games.js", "teacher.js", "task-page.js", "tracker.js", "config.js", "styles.css", "guides/fizika-9-klass-oge.pdf", "guides/fizika-9-klass-oge-preview.png", "games/field.html", "games/goldberg.html", "games/alchemy.html", "games/pressure-duel.html", "games/physics-detective.html"];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, "dist", file))) throw new Error(`Приватный файл попал в dist: ${file}`);
}
for (const file of publicFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Отсутствует публичный файл: ${file}`);
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "activities.json"), "utf8"));
const ids = new Set();
const publicQuestionKeys = new Set();
const supportedDiagrams = new Set(["coord1", "coord2", "speed1", "speed2", "g6v1q2", "g6v1q3", "g6v2q2", "g6v2q3", "g7v1q3", "g7v2q3"]);
let diagramCount = 0;
let visualQuestionCount = 0;
for (const activity of catalog.activities) {
  if (!/^[a-z0-9-]+$/.test(activity.id)) throw new Error(`Некорректный id: ${activity.id}`);
  if (ids.has(activity.id)) throw new Error(`Повторяющийся id: ${activity.id}`);
  ids.add(activity.id);
  if (!activity.title || !activity.url || !["server-graded", "visit-only"].includes(activity.verificationMode)) throw new Error(`Неполная карточка: ${activity.id}`);
  const thresholds = activity.gradeThresholds;
  if (!thresholds || !(thresholds["5"] > thresholds["4"] && thresholds["4"] > thresholds["3"] && thresholds["3"] >= thresholds["2"])) throw new Error(`Некорректные пороги оценок: ${activity.id}`);
  if (activity.verificationMode === "server-graded") {
    const content = path.join(root, "data", "task-content", `${activity.id}.json`);
    if (!fs.existsSync(content)) throw new Error(`Нет публичного содержания: ${activity.id}`);
    const text = fs.readFileSync(content, "utf8");
    if (/"(?:answer|expected|solutionHtml|correct)"\s*:/.test(text)) throw new Error(`Ответы попали в публичный файл: ${activity.id}`);
    const payload = JSON.parse(text);
    if (!Array.isArray(payload.variants) || !payload.variants.length) throw new Error(`Нет вариантов: ${activity.id}`);
    const questionCount = Math.max(...payload.variants.map((variant) => variant.questions.length));
    const maxPoints = Math.max(...payload.variants.map((variant) => Number(variant.maxPoints)));
    if (questionCount !== Number(activity.questionCount)) throw new Error(`Не совпадает число вопросов: ${activity.id}`);
    if (maxPoints !== Number(activity.maxPoints)) throw new Error(`Не совпадает максимум работы: ${activity.id}`);
    for (const variant of payload.variants) for (const question of variant.questions) {
      const key = `${activity.id}/${variant.id}/${question.id}`;
      if (publicQuestionKeys.has(key)) throw new Error(`Повторяющийся вопрос: ${key}`);
      if (question.diagram && !supportedDiagrams.has(question.diagram)) throw new Error(`Неизвестная диаграмма: ${key}/${question.diagram}`);
      if (question.diagram) diagramCount += 1;
      if (question.diagram || question.graph) visualQuestionCount += 1;
      const wordingRequiresVisual = /(?:на рисун|по график|по рисунк|представлены график|проекцию вектора перемещения на ось O[XY])/i.test(`${question.title || ""} ${question.prompt || ""}`);
      if (wordingRequiresVisual && !question.diagram && !question.graph) throw new Error(`Вопрос ссылается на отсутствующий рисунок или график: ${key}`);
      publicQuestionKeys.add(key);
    }
  }
}
if (diagramCount !== supportedDiagrams.size) throw new Error(`Ожидалось ${supportedDiagrams.size} диаграмм, найдено ${diagramCount}.`);
if (visualQuestionCount !== 14) throw new Error(`Ожидалось 14 заданий с графикой, найдено ${visualQuestionCount}.`);
const olympiad = fs.readFileSync(path.join(root, "tasks", "olympiad-physics.html"), "utf8");
if (/"answerImage"\s*:/.test(olympiad) || /solutions\.html/.test(olympiad)) throw new Error("Скрытые олимпиадные ответы попали в публичный HTML.");
if (/"problemImage"\s*:\s*"data:image\//.test(olympiad)) throw new Error("Изображения олимпиадных задач должны загружаться отдельно.");
const olympiadAssetCount = fs.readdirSync(path.join(root, "tasks", "olympiad-assets")).filter((name) => /\.(?:jpe?g|png|webp)$/i.test(name)).length;
if (olympiadAssetCount !== 365) throw new Error(`Ожидалось 365 изображений олимпиадных задач, найдено ${olympiadAssetCount}.`);

for (const trainer of ["accelerated-motion.html", "curvilinear-motion.html", "oge-formulas.html"]) {
  const html = fs.readFileSync(path.join(root, "tasks", trainer), "utf8");
  if (!/<script\s+src="\.\.\/config\.js\?v=\d+"><\/script>/.test(html)) throw new Error(`В тренажёре ${trainer} не подключены настройки портала.`);
  if (!/import\(["']\.\.\/tracker\.js["']\)/.test(html)) throw new Error(`В тренажёре ${trainer} не подключён журнал посещений.`);
}

const privatePath = path.join(root, "answers.private.json");
if (fs.existsSync(privatePath)) {
  const privateData = JSON.parse(fs.readFileSync(privatePath, "utf8"));
  const privateKeys = new Map(privateData.activities.flatMap((activity) => activity.answers.map((answer) => [`${activity.id}/${answer.variantId}/${answer.questionId}`, answer])));
  for (const activity of catalog.activities.filter((item) => item.verificationMode === "server-graded")) {
    const content = JSON.parse(fs.readFileSync(path.join(root, "data", "task-content", `${activity.id}.json`), "utf8"));
    for (const variant of content.variants) {
      const keyPoints = variant.questions.reduce((sum, question) => {
        const key = privateKeys.get(`${activity.id}/${variant.id}/${question.id}`);
        if (!key) throw new Error(`Нет приватного ключа: ${activity.id}/${variant.id}/${question.id}`);
        if (Boolean(question.scored) !== (key.matcherType !== "ungraded")) throw new Error(`Не совпадает режим проверки: ${activity.id}/${variant.id}/${question.id}`);
        const choiceCount = question.options?.length || question.graph?.lines?.length || 0;
        if (key.matcherType === "choice" && (!Number.isInteger(Number(key.expected)) || Number(key.expected) < 1 || Number(key.expected) > choiceCount)) throw new Error(`Ответ вне диапазона: ${activity.id}/${variant.id}/${question.id}`);
        if (key.matcherType === "numeric" && !Number.isFinite(Number(key.expected))) throw new Error(`Некорректный числовой ответ: ${activity.id}/${variant.id}/${question.id}`);
        if (key.matcherType === "match" && (!Array.isArray(key.expected) || key.expected.length !== question.rows.length || key.expected.some((value) => !question.options.some((option, index) => String(typeof option === "object" ? option.value : index + 1) === String(value))))) throw new Error(`Некорректное соответствие: ${activity.id}/${variant.id}/${question.id}`);
        if (/<(?:script|iframe|object|embed|style|img|svg)\b|\son[a-z]+\s*=|javascript:/i.test(key.solutionHtml || "")) throw new Error(`Небезопасное решение: ${activity.id}/${variant.id}/${question.id}`);
        return sum + Number(key.points);
      }, 0);
      if (Number(variant.maxPoints) !== keyPoints) throw new Error(`Не совпадает максимум баллов: ${activity.id}/${variant.id}`);
    }
  }
  for (const key of privateKeys.keys()) if (!publicQuestionKeys.has(key)) throw new Error(`Лишний или устаревший приватный ключ: ${key}`);
}
console.log(`PASS: ${catalog.activities.length} карточек, ${publicQuestionKeys.size} вопросов, приватные ответы не опубликованы.`);
