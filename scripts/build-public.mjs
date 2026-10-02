import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const files = [
  "index.html", "guides.html", "games.html", "teacher.html", "task.html", "styles.css", "config.js",
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(dist, file));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "activities.json"), "utf8"));
fs.mkdirSync(path.join(dist, "data", "task-content"), { recursive: true });
fs.mkdirSync(path.join(dist, "tasks"), { recursive: true });
fs.mkdirSync(path.join(dist, "guides"), { recursive: true });
fs.mkdirSync(path.join(dist, "games"), { recursive: true });
fs.copyFileSync(path.join(root, "guides", "fizika-9-klass-oge.pdf"), path.join(dist, "guides", "fizika-9-klass-oge.pdf"));
fs.copyFileSync(path.join(root, "guides", "fizika-9-klass-oge-preview.png"), path.join(dist, "guides", "fizika-9-klass-oge-preview.png"));
for (const game of ["field.html", "goldberg.html", "alchemy.html", "pressure-duel.html", "physics-detective.html"]) {
  fs.copyFileSync(path.join(root, "games", game), path.join(dist, "games", game));
}
fs.copyFileSync(path.join(root, "data", "activities.json"), path.join(dist, "data", "activities.json"));
const copiedTaskPages = new Set();
for (const activity of catalog.activities.filter((item) => item.published)) {
  if (activity.verificationMode === "server-graded") {
    const name = `${activity.id}.json`;
    fs.copyFileSync(path.join(root, "data", "task-content", name), path.join(dist, "data", "task-content", name));
  } else {
    const parsed = new URL(activity.url, "https://portal.local/");
    const taskPath = parsed.pathname.replace(/^\//, "");
    const safeQuery = [...parsed.searchParams].every(([key, value]) => key === "work" && /^\d+$/.test(value));
    if (!/^tasks\/[a-z0-9-]+\.html$/.test(taskPath) || parsed.hash || !safeQuery) throw new Error(`Небезопасный путь работы: ${activity.url}`);
    if (!copiedTaskPages.has(taskPath)) {
      fs.copyFileSync(path.join(root, taskPath), path.join(dist, taskPath));
      copiedTaskPages.add(taskPath);
    }
  }
}
const olympiadAssets = path.join(root, "tasks", "olympiad-assets");
if (fs.existsSync(olympiadAssets)) fs.cpSync(olympiadAssets, path.join(dist, "tasks", "olympiad-assets"), { recursive: true });
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

const publicUrl = process.env.SUPABASE_URL || "";
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
if (process.env.REQUIRE_SUPABASE_CONFIG === "1" && (!publicUrl || !publicKey)) {
  throw new Error("Для публикации нужны SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY.");
}
if (publicUrl || publicKey) {
  if (!/^https:\/\/.+\.supabase\.co$/.test(publicUrl) || !publicKey.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_URL или SUPABASE_PUBLISHABLE_KEY имеют неверный формат.");
  }
  const configPath = path.join(dist, "config.js");
  const config = fs.readFileSync(configPath, "utf8")
    .replace('supabaseUrl: ""', `supabaseUrl: ${JSON.stringify(publicUrl)}`)
    .replace('supabasePublishableKey: ""', `supabasePublishableKey: ${JSON.stringify(publicKey)}`);
  fs.writeFileSync(configPath, config);
}

await build({
  absWorkingDir: root,
  entryPoints: ["portal.js", "guides.js", "games.js", "teacher.js", "task-page.js", "tracker.js"],
  outdir: dist,
  bundle: true,
  format: "esm",
  splitting: true,
  chunkNames: "assets/[name]-[hash]",
  minify: true,
  legalComments: "none",
  target: "es2022",
  logLevel: "silent",
});

const forbiddenNamePattern = /(^|[._-])(answers?|solutions?)[._-]?(private|backup|secret)?\.(json|html|js)$|^\.env/i;
const sensitivePattern = /(sb_secret_|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|"expected_json"\s*:|"answerImage"\s*:)/i;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (forbiddenNamePattern.test(entry.name)) throw new Error(`Приватный файл попал в сборку: ${absolute}`);
    if (entry.isDirectory()) inspect(absolute);
    else if (/\.(?:html|js|json|css)$/i.test(entry.name)) {
      const text = fs.readFileSync(absolute, "utf8");
      if (sensitivePattern.test(text)) throw new Error(`Служебные данные найдены в публичной сборке: ${absolute}`);
    }
  }
}
inspect(dist);
console.log(`PASS: публичная сборка создана в ${dist}`);
