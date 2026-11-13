export function parsePracticeEvent(row) {
  if (typeof row?.path !== "string") return null;
  let url;
  try { url = new URL(row.path, "https://portal.invalid"); }
  catch { return null; }
  const gravity = url.pathname.endsWith("/tasks/free-fall-gravity.html");
  const friction = url.pathname.endsWith("/tasks/friction.html");
  const impulseWork = url.pathname.endsWith("/tasks/impulse-work/index.html");
  const standaloneMatch = /\/tasks\/gromtseva-sr-(1[4-8])\.html$/.exec(url.pathname);
  if (!gravity && !friction && !impulseWork && !standaloneMatch) return null;
  const source = gravity ? "gravity" : friction ? "friction" : impulseWork ? "impulse-work" : `sr-${standaloneMatch[1]}`;
  const kind = url.searchParams.get("practice");
  if (kind === "open") return { source, kind, at: row.visited_at };
  if (kind !== "check") return null;
  const task = url.searchParams.get("task") || "";
  const impulseWorkTasks = new Set(["direction", "car", "balls", "train", "cart", "olymp-impulse", "work-zero", "work-right", "work-obtuse", "olymp-work"]);
  if (impulseWork ? !impulseWorkTasks.has(task) : gravity || friction ? !/^[1-3]-[1-2]-[1-5]$/.test(task) : !/^[1-2]-[1-4]$/.test(task)) return null;
  if (standaloneMatch && standaloneMatch[1] !== "18" && task.endsWith("-4")) return null;
  const stage = impulseWork ? url.searchParams.get("stage") || "" : "";
  if (impulseWork && !["analysis", "conversion", "formula", "result"].includes(stage)) return null;
  const result = url.searchParams.get("correct");
  if (result !== "0" && result !== "1") return null;
  return { source, kind, task, stage, correct: result === "1", answer: (url.searchParams.get("answer") || "").slice(0, 120), at: row.visited_at };
}

export const impulseWorkTasks = [
  { id: "direction", title: "Куда направлен импульс?", topic: "Импульс" },
  { id: "car", title: "Легковой автомобиль", topic: "Импульс" },
  { id: "balls", title: "Два пластилиновых шарика", topic: "Импульс" },
  { id: "train", title: "Электровоз и вагон", topic: "Импульс" },
  { id: "cart", title: "Тележка и встречный шар", topic: "Импульс" },
  { id: "olymp-impulse", title: "Сила на графике и трение", topic: "Импульс" },
  { id: "work-zero", title: "Сила вдоль движения", topic: "Работа" },
  { id: "work-right", title: "Сила поперёк движения", topic: "Работа" },
  { id: "work-obtuse", title: "Сила мешает движению", topic: "Работа" },
  { id: "olymp-work", title: "Канат на наклонной плоскости", topic: "Работа" },
];

export function summarizeImpulseWork(rows) {
  const tasks = impulseWorkTasks.map((task) => ({ ...task, solved: false, checks: 0, errors: 0, lastAt: null }));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  let opens = 0;
  for (const row of rows) {
    const event = parsePracticeEvent(row);
    if (!event || event.source !== "impulse-work") continue;
    if (event.kind === "open") { opens += 1; continue; }
    const task = byId.get(event.task);
    task.checks += 1;
    if (!event.correct) task.errors += 1;
    if (event.stage === "result" && event.correct) task.solved = true;
    if (!task.lastAt || event.at > task.lastAt) task.lastAt = event.at;
  }
  return {
    opens,
    solved: tasks.filter((task) => task.solved).length,
    checks: tasks.reduce((sum, task) => sum + task.checks, 0),
    errors: tasks.reduce((sum, task) => sum + task.errors, 0),
    tasks,
  };
}

export function summarizePractice(rows, source = "gravity") {
  const variants = Array.from({ length: 6 }, (_, index) => ({
    work: Math.floor(index / 2) + 1,
    variant: index % 2 + 1,
    solved: new Set(),
    checks: 0,
    errors: 0,
    lastAt: null,
  }));
  let opens = 0;
  let eventCount = 0;
  for (const row of rows) {
    const event = parsePracticeEvent(row);
    if (!event || event.source !== source) continue;
    eventCount += 1;
    if (event.kind === "open") { opens += 1; continue; }
    const [work, variant] = event.task.split("-").map(Number);
    const group = variants[(work - 1) * 2 + variant - 1];
    group.checks += 1;
    if (event.correct) group.solved.add(event.task);
    else group.errors += 1;
    if (!group.lastAt || event.at > group.lastAt) group.lastAt = event.at;
  }
  return {
    opens,
    eventCount,
    checks: variants.reduce((sum, group) => sum + group.checks, 0),
    errors: variants.reduce((sum, group) => sum + group.errors, 0),
    solved: variants.reduce((sum, group) => sum + group.solved.size, 0),
    variants: variants.map(({ solved, ...group }) => ({ ...group, solved: solved.size })),
  };
}

export function summarizeStandalone(rows) {
  const works = Array.from({ length: 5 }, (_, index) => ({
    number: index + 14,
    visits: 0,
    solved: [new Set(), new Set()],
    checks: 0,
    errors: 0,
    lastAt: null,
  }));
  let checkCount = 0;
  for (const row of rows) {
    const event = parsePracticeEvent(row);
    if (!event || !event.source.startsWith("sr-")) continue;
    const work = works[Number(event.source.slice(3)) - 14];
    if (event.kind === "open") { work.visits += 1; continue; }
    checkCount += 1;
    work.checks += 1;
    if (event.correct) work.solved[Number(event.task[0]) - 1].add(event.task);
    else work.errors += 1;
    if (!work.lastAt || event.at > work.lastAt) work.lastAt = event.at;
  }
  return {
    checkCount,
    works: works.map(({ solved, ...work }) => ({ ...work, solved: solved.map((tasks) => tasks.size) })),
  };
}

export function summarizeIndependent(activities, rows, attempts) {
  const rowById = new Map(rows.map((row) => [row.activityId, row]));
  return activities.filter((activity) => activity.subject === "Самостоятельные" && activity.verificationMode === "server-graded").map((activity) => {
    const row = rowById.get(activity.id);
    const runs = row?.runs || [];
    const answerRows = attempts.filter((attempt) => attempt.activityId === activity.id && attempt.graded);
    const lastAt = [row?.lastVisitAt, ...runs.map((run) => run.submittedAt || run.startedAt), ...answerRows.map((attempt) => attempt.createdAt)]
      .filter(Boolean).sort().at(-1) || null;
    return {
      id: activity.id,
      title: activity.title,
      visits: row?.visitCount || 0,
      status: runs.some((run) => run.status === "submitted") ? "Сдана" : runs.length ? "В работе" : "Не начата",
      correct: answerRows.filter((attempt) => attempt.correct).length,
      checked: answerRows.length,
      bestRun: row?.bestRun || null,
      lastAt,
    };
  });
}
