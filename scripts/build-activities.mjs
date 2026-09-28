import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(project, "..");
const publicData = path.join(project, "data", "task-content");
const privateFile = path.join(project, "answers.private.json");
const taskDir = path.join(project, "tasks");

function extractArray(file, variable) {
  const source = fs.readFileSync(file, "utf8");
  const marker = new RegExp(`(?:const|let|var|export\\s+const)\\s+${variable}\\s*=`, "m");
  const match = marker.exec(source);
  if (!match) throw new Error(`Не найден массив ${variable} в ${file}`);
  const start = source.indexOf("[", match.index + match[0].length);
  let depth = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index], next = source[index + 1];
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (["'", '"', "`"].includes(char)) { quote = char; continue; }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return vm.runInNewContext(`(${source.slice(start, index + 1)})`, Object.create(null), { timeout: 3000 });
    }
  }
  throw new Error(`Массив ${variable} не закрыт`);
}

const allowedSolutionTags = new Set(["p", "strong", "b", "em", "i", "br", "sub", "sup", "ul", "ol", "li"]);
function cleanHtml(value) {
  return String(value ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi, (tag, name) => {
      const normalized = String(name).toLowerCase();
      if (!allowedSolutionTags.has(normalized)) return "";
      if (normalized === "br") return "<br>";
      return tag.startsWith("</") ? `</${normalized}>` : `<${normalized}>`;
    })
    .trim();
}
const privateAnswers = { version: 1, generatedAt: new Date().toISOString(), activities: [] };
const publicActivities = [];

function addActivity(id, variants, answers) {
  const publicPayload = { version: 1, activityId: id, variants };
  const serialized = JSON.stringify(publicPayload, null, 2);
  if (/"(?:answer|expected|solutionHtml|correct)"\s*:/.test(serialized)) throw new Error(`Секретные поля попали в публичный файл ${id}`);
  fs.writeFileSync(path.join(publicData, `${id}.json`), serialized + "\n");
  privateAnswers.activities.push({ id, answers });
  publicActivities.push({ id, variants: variants.length, questions: variants.reduce((sum, variant) => sum + variant.questions.filter((q) => q.scored).length, 0) });
}

fs.mkdirSync(publicData, { recursive: true });
fs.mkdirSync(taskDir, { recursive: true });

const formulas = extractArray(path.join(workspace, "physics-progress-site", "lib", "catalog.ts"), "FORMULAS");
addActivity("oge-formulas", [{
  id: "default", title: "Все формулы", maxPoints: formulas.length,
  questions: formulas.map((item) => ({ id: item.id, title: item.name, prompt: item.desc, kind: "formula", palette: item.palette, unit: item.unit, points: 1, scored: true })),
}], formulas.map((item) => ({
  variantId: "default", questionId: item.id, matcherType: "formula", expected: item.correct,
  tolerance: 0, points: 1, solutionHtml: cleanHtml(`<p><strong>${item.correct.join(" или ")}</strong></p><p>${item.theory}</p><p>${item.tip}</p>`),
})));

const reviewTasks = extractArray(path.join(workspace, "9_grade_first_lesson_review", "dist", "index.html"), "TASKS");
const reviewQuestions = [], reviewAnswers = [];
for (const item of reviewTasks) {
  let kind = item.type;
  const question = { id: item.id, title: item.title, prompt: item.prompt, kind, points: 2, scored: true };
  let expected;
  if (kind === "choice") { question.options = item.options; expected = String(Number(item.answer) + 1); }
  else if (kind === "numeric") { question.unit = item.unit; expected = item.answer; }
  else if (kind === "match") {
    question.rows = item.rows.map((row) => row.label);
    question.options = item.options.map((option) => ({ value: String(option.value), label: option.label }));
    expected = item.rows.map((row) => String(row.answer));
  }
  reviewQuestions.push(question);
  const solution = item.solutionSteps ? item.solutionSteps.map((step) => `<p><strong>${step.title}</strong><br>${step.body}</p>`).join("") : item.solution;
  reviewAnswers.push({ variantId: "default", questionId: item.id, matcherType: kind, expected, tolerance: item.tolerance || 0, points: 2, solutionHtml: cleanHtml(solution) });
}
addActivity("grade9-review", [{ id: "default", title: "Диагностика", maxPoints: 32, questions: reviewQuestions }], reviewAnswers);

const krVariants = extractArray(path.join(workspace, "9_gromceva_kr1_all_variants.html"), "V");
const krPublic = [], krAnswers = [];
for (const variant of krVariants) {
  const variantId = `v${variant.n}`;
  const questions = variant.tasks.map((item, index) => {
    const id = `${variantId}-q${index + 1}`;
    let kind = item.choices ? "choice" : item.graph ? "graph" : item.match ? "match" : "numeric";
    const question = { id, title: item.q, prompt: "", kind, points: 1, scored: true };
    if (item.choices) question.options = item.choices;
    if (item.graph) question.graph = item.graph;
    if (item.match) { question.rows = item.match.rows; question.options = item.match.opts; }
    if (item.numeric) question.unit = item.numeric.unit;
    krAnswers.push({ variantId, questionId: id, matcherType: kind === "graph" ? "choice" : kind, expected: item.a, tolerance: item.tol || 0, points: 1, solutionHtml: cleanHtml(item.s) });
    return question;
  });
  krPublic.push({ id: variantId, title: `Вариант ${variant.n}`, maxPoints: questions.length, questions });
}
addActivity("gromtseva-kr1", krPublic, krAnswers);

const works = extractArray(path.join(workspace, "9_gromceva_sr1_10_all_variants.html"), "WORKS");
fs.rmSync(path.join(publicData, "gromtseva-sr.json"), { force: true });
for (const work of works) {
  const activityId = `gromtseva-sr-${work.id}`;
  const srPublic = [], srAnswers = [];
  for (const variant of work.variants) {
    const variantId = `v${variant.n}`;
    let maxPoints = 0;
    const questions = variant.tasks.map((item, index) => {
      const id = `${variantId}-q${index + 1}`;
      const scored = item.kind !== "text";
      const kind = scored ? (item.kind === "number" ? "numeric" : item.kind) : "ungraded-text";
      const question = { id, title: item.q, prompt: "", kind, points: scored ? 1 : 0, scored };
      if (item.options) question.options = item.options;
      if (item.unit) question.unit = item.unit;
      if (item.diagram) question.diagram = item.diagram;
      if (scored) {
        maxPoints += 1;
        srAnswers.push({ variantId, questionId: id, matcherType: kind, expected: item.answer, tolerance: item.tol || 0, points: 1, solutionHtml: cleanHtml(item.a) });
      } else {
        srAnswers.push({ variantId, questionId: id, matcherType: "ungraded", expected: null, tolerance: 0, points: 0, solutionHtml: "" });
      }
      return question;
    });
    srPublic.push({ id: variantId, title: `Вариант ${variant.n}`, maxPoints, questions });
  }
  addActivity(activityId, srPublic, srAnswers);
}

fs.writeFileSync(privateFile, JSON.stringify(privateAnswers, null, 2) + "\n", { mode: 0o600 });
fs.chmodSync(privateFile, 0o600);

let olympiad = fs.readFileSync(path.join(workspace, "9phys-olympiad-site", "index.html"), "utf8");
const problemsStartMarker = "var PROBLEMS=";
const problemsEndMarker = ";\n    document.title";
const problemsStart = olympiad.indexOf(problemsStartMarker) + problemsStartMarker.length;
const problemsEnd = olympiad.indexOf(problemsEndMarker, problemsStart);
if (problemsStart < problemsStartMarker.length || problemsEnd < 0) throw new Error("Не удалось найти данные олимпиадных задач.");
const olympiadAssets = path.join(taskDir, "olympiad-assets");
fs.rmSync(olympiadAssets, { recursive: true, force: true });
fs.mkdirSync(olympiadAssets, { recursive: true });
const publicProblems = JSON.parse(olympiad.slice(problemsStart, problemsEnd)).map(({ answerImage: _privateAnswer, problemImage, ...problem }, index) => {
  const match = /^data:image\/(jpeg|png|webp);base64,(.+)$/s.exec(problemImage || "");
  if (!match) throw new Error(`Не удалось извлечь изображение олимпиадной задачи ${problem.id}.`);
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const fileName = `${String(index + 1).padStart(3, "0")}.${extension}`;
  fs.writeFileSync(path.join(olympiadAssets, fileName), Buffer.from(match[2], "base64"));
  return { ...problem, problemImage: `olympiad-assets/${fileName}` };
});
olympiad = `${olympiad.slice(0, problemsStart)}${JSON.stringify(publicProblems)}${olympiad.slice(problemsEnd)}`;
olympiad = olympiad.replace('"otherPage": "solutions.html", "otherLabel": "Ответы и решения"', '"otherPage": "../index.html", "otherLabel": "К порталу"');
olympiad = olympiad.replace(/if\(CONFIG\.mode==="solutions"\)\{[\s\S]*?el\.append\(az\)\}/, "");
olympiad = olympiad.replace("Изображения встроены в HTML", "Изображения загружаются по мере просмотра");
olympiad = olympiad.replace("Все изображения и данные находятся внутри этого HTML-файла. Внешние файлы и PDF не требуются.", "Изображения задач загружаются отдельно по мере просмотра, поэтому страница открывается быстрее.");
olympiad = olympiad.replace("  </style>", `    .portal-access{width:min(1160px,calc(100% - 1.5rem));margin:1rem auto 0;padding:.85rem 1rem;border-left:4px solid var(--orange);border-radius:10px;background:var(--orange-soft);color:#9a3412;font-weight:750}
    .portal-access.closed{margin-top:2rem;padding:1.2rem;border-left-color:#dc2626;background:#fef2f2;color:#991b1b}
    .portal-access a{color:#1d4ed8}
  </style>`);
olympiad = olympiad.replace("</body>", `<script src="../config.js?v=2"></script><script type="module">
  import {PhysicsTracker} from "../tracker.js";
  const activityId="olympiad-physics",key=\`physics-entry:\${activityId}\`,entryId=sessionStorage.getItem(key)||crypto.randomUUID();
  sessionStorage.removeItem(key);
  const banner=document.createElement("div");banner.className="portal-access";banner.hidden=true;document.querySelector(".topbar").after(banner);
  const main=document.querySelector("main");main.hidden=true;let row=null,offset=0,studentName="";
  const formatDate=value=>new Intl.DateTimeFormat("ru-RU",{dateStyle:"long",timeStyle:"short"}).format(new Date(value));
  const remaining=value=>{const seconds=Math.max(0,Math.ceil((Date.parse(value)-(Date.now()+offset))/1000)),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60,clock=[hours,minutes,rest].map(part=>String(part).padStart(2,"0")).join(":");return days?\`\${days} дн. \${clock}\`:clock};
  function render(){if(!row)return;const address=studentName?\`\${studentName}, \`:"",expired=Boolean(row.deadlineAt&&Date.parse(row.deadlineAt)<=Date.now()+offset),closed=row.manuallyClosed||expired;if(closed){main.hidden=true;banner.hidden=false;banner.className="portal-access closed";banner.textContent=row.manuallyClosed?\`\${address}работа закрыта преподавателем.\`:\`\${address}время выполнения истекло. Срок был \${formatDate(row.deadlineAt)}.\`;return}main.hidden=false;if(row.deadlineAt){banner.hidden=false;banner.className="portal-access";banner.textContent=\`\${address}сдать до \${formatDate(row.deadlineAt)} · осталось \${remaining(row.deadlineAt)}\`}else banner.hidden=true}
  try{await PhysicsTracker.openActivity(activityId,entryId);const progress=await PhysicsTracker.loadProgress(activityId);if(progress.serverTime)offset=Date.parse(progress.serverTime)-Date.now();studentName=progress.student?.name||"";if(studentName)document.querySelector("h1").textContent=\`\${studentName}, олимпиадная физика\`;row=progress.activities?.find(item=>item.activityId===activityId);if(!row)throw new Error("Работа не найдена");render();setInterval(render,1000)}catch(error){main.hidden=true;banner.hidden=false;banner.className="portal-access closed";banner.innerHTML=\`Сначала войдите на <a href="../">главной странице портала</a>, чтобы открыть работу.\`}
</script></body>`);
olympiad = olympiad.replace(/[ \t]+$/gm, "");
fs.writeFileSync(path.join(taskDir, "olympiad-physics.html"), olympiad);

console.log(JSON.stringify({ publicActivities, privateAnswers: privateAnswers.activities.reduce((sum, activity) => sum + activity.answers.length, 0), olympiadBytes: Buffer.byteLength(olympiad) }, null, 2));
