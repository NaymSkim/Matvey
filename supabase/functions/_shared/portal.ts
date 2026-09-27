import { createClient } from "npm:@supabase/supabase-js@2";

type Operation =
  | "claim-student" | "student-progress" | "open-activity" | "start-run"
  | "submit-answer" | "submit-run" | "released-solutions"
  | "teacher-summary" | "teacher-admin";

class PortalError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
function defaultKeyFromSet(name: string) {
  try { return JSON.parse(Deno.env.get(name) || "{}").default || ""; }
  catch { return ""; }
}
const secretKey = defaultKeyFromSet("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const configured = (Deno.env.get("SITE_ORIGIN") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowed = !origin || configured.includes(origin) || local;
  return {
    "Access-Control-Allow-Origin": allowed ? (origin || configured[0] || "null") : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function originAllowed(req: Request) {
  const origin = req.headers.get("origin") || "";
  const configured = (Deno.env.get("SITE_ORIGIN") || "").split(",").map((item) => item.trim()).filter(Boolean);
  return !origin || configured.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: cors(req) });
}

function assertUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new PortalError(`Некорректное поле ${field}.`);
  }
  return value;
}

function assertId(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]{1,120}$/.test(value)) throw new PortalError(`Некорректное поле ${field}.`);
  return value;
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function hashCode(code: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256);
  return `pbkdf2-sha256$120000$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

async function verifyCode(code: string, encoded: string) {
  const [scheme, iterationText, saltText, hashText] = encoded.split("$");
  if (scheme !== "pbkdf2-sha256" || !saltText || !hashText) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltText), iterations: Number(iterationText) }, key, 256));
  const expected = fromBase64(hashText);
  if (bits.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < bits.length; index += 1) difference |= bits[index] ^ expected[index];
  return difference === 0;
}

async function body(req: Request) {
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 16_000) throw new PortalError("Запрос слишком большой.", 413);
  const text = await req.text();
  if (text.length > 16_000) throw new PortalError("Запрос слишком большой.", 413);
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new PortalError("Запрос имеет неверный формат."); }
}

async function currentUser(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new PortalError("Сначала войдите в портал.", 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new PortalError("Сессия истекла. Войдите снова.", 401);
  return data.user;
}

async function studentFor(userId: string) {
  const { data: device, error } = await admin.from("student_devices").select("student_id").eq("auth_user_id", userId).maybeSingle();
  if (error) throw error;
  if (!device) throw new PortalError("Это устройство ещё не привязано к ученику.", 403);
  const { data: student, error: studentError } = await admin.from("students").select("id, display_name, active, created_at, last_active_at").eq("id", device.student_id).eq("active", true).single();
  if (studentError || !student) throw new PortalError("Доступ ученика отключён.", 403);
  const updates = await Promise.all([
    admin.from("student_devices").update({ last_seen_at: new Date().toISOString() }).eq("auth_user_id", userId),
    admin.from("students").update({ last_active_at: new Date().toISOString() }).eq("id", student.id),
  ]);
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) throw updateError;
  return student;
}

async function requireTeacher(userId: string) {
  const { data, error } = await admin.from("teachers").select("auth_user_id, email").eq("auth_user_id", userId).maybeSingle();
  if (error || !data) throw new PortalError("Этот аккаунт не является аккаунтом преподавателя.", 403);
  return data;
}

function publicRun(run: Record<string, unknown>) {
  return {
    id: run.id,
    activityId: run.activity_id,
    variantId: run.variant_id,
    runNo: Number(run.run_no),
    status: run.status,
    score: Number(run.score),
    maxPoints: Number(run.max_points),
    percent: run.percent == null ? null : Number(run.percent),
    grade: run.grade == null ? null : Number(run.grade),
    startedAt: run.started_at,
    submittedAt: run.submitted_at,
  };
}

function bestRun(runs: Array<Record<string, unknown>>) {
  const submitted = runs.filter((run) => run.status === "submitted");
  const graded = submitted.filter((run) => run.grade != null).sort((a, b) => Number(b.percent) - Number(a.percent) || Number(b.score) - Number(a.score));
  return graded[0] || submitted.sort((a, b) => String(b.submittedAt || b.submitted_at).localeCompare(String(a.submittedAt || a.submitted_at)))[0] || null;
}

function gradeFor(percent: number, thresholds: Record<string, number>) {
  if (percent >= Number(thresholds["5"] ?? 85)) return 5;
  if (percent >= Number(thresholds["4"] ?? 65)) return 4;
  if (percent >= Number(thresholds["3"] ?? 40)) return 3;
  return 2;
}

function normalizeFormula(value: unknown) {
  const source = Array.isArray(value) ? value.join("") : String(value ?? "");
  return source.normalize("NFKC").replace(/[\s*×]/g, "").replace(/[–—−]/g, "-").replace(/,/g, ".");
}

function matchesAnswer(kind: string, answer: unknown, expected: unknown, tolerance: number) {
  if (kind === "numeric") {
    const actual = Number(String(answer ?? "").trim().replace(",", "."));
    const target = Number(expected);
    return Number.isFinite(actual) && Number.isFinite(target) && Math.abs(actual - target) <= tolerance;
  }
  if (kind === "match") {
    return Array.isArray(answer) && Array.isArray(expected) && answer.length === expected.length && answer.every((value, index) => String(value) === String(expected[index]));
  }
  if (kind === "formula") {
    const candidates = Array.isArray(expected) ? expected : [expected];
    const actual = normalizeFormula(answer);
    return candidates.some((candidate) => normalizeFormula(candidate) === actual);
  }
  return String(answer ?? "").trim() === String(expected ?? "").trim();
}

function validateAnswer(kind: string, answer: unknown) {
  let encoded = "";
  try { encoded = JSON.stringify(answer); } catch { throw new PortalError("Ответ имеет неверный формат."); }
  if (!encoded || encoded.length > 8_000) throw new PortalError("Ответ слишком большой.", 413);
  if (kind === "formula") {
    if (!Array.isArray(answer) || answer.length > 60 || answer.some((token) => typeof token !== "string" || token.length > 30)) throw new PortalError("Формула имеет неверный формат.");
  } else if (kind === "match") {
    if (!Array.isArray(answer) || answer.length > 30 || answer.some((value) => typeof value !== "string" || value.length > 100)) throw new PortalError("Ответ имеет неверный формат.");
  } else if (kind === "ungraded") {
    if (typeof answer !== "string" || answer.length > 4_000) throw new PortalError("Открытый ответ не должен превышать 4000 знаков.", 413);
  } else if (typeof answer !== "string" && typeof answer !== "number") {
    throw new PortalError("Ответ имеет неверный формат.");
  } else if (String(answer).length > 200) {
    throw new PortalError("Ответ слишком большой.", 413);
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function claimStudent(req: Request, userId: string, input: Record<string, unknown>) {
  const linked = await admin.from("student_devices").select("student_id, students!inner(id, display_name, active)").eq("auth_user_id", userId).maybeSingle();
  if (linked.data && (linked.data.students as unknown as { active: boolean }).active) {
    const student = linked.data.students as unknown as { id: string; display_name: string };
    return { student: { id: student.id, name: student.display_name } };
  }
  const name = normalizeName(input.name);
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const clientFingerprint = assertUuid(input.clientFingerprint, "clientFingerprint");
  if (!name || !/^[A-Z0-9]{8}$/.test(code)) throw new PortalError("Проверьте имя и восьмизначный код.");
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const forwarded = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
  const networkHash = await digest(`${secretKey.slice(-24)}:${forwarded || userId}`);
  const { count, error: attemptsError } = await admin.from("claim_attempts").select("id", { count: "exact", head: true })
    .or(`auth_user_id.eq.${userId},client_fingerprint.eq.${clientFingerprint},network_hash.eq.${networkHash}`)
    .eq("succeeded", false).gte("attempted_at", cutoff);
  if (attemptsError) throw attemptsError;
  if ((count || 0) >= 5) throw new PortalError("Слишком много неверных попыток. Попробуйте через 15 минут.", 429);
  const { data: candidates, error } = await admin.from("students").select("id, display_name, code_hash").eq("normalized_name", name).eq("active", true).limit(20);
  if (error) throw error;
  let student: { id: string; display_name: string; code_hash: string } | undefined;
  for (const candidate of candidates || []) if (await verifyCode(code, candidate.code_hash)) { student = candidate; break; }
  const { error: logError } = await admin.from("claim_attempts").insert({ auth_user_id: userId, client_fingerprint: clientFingerprint, network_hash: networkHash, succeeded: Boolean(student) });
  if (logError) throw logError;
  if (!student) throw new PortalError("Имя или код не совпадают.", 403);
  const { error: linkError } = await admin.from("student_devices").upsert({ student_id: student.id, auth_user_id: userId, last_seen_at: new Date().toISOString() }, { onConflict: "auth_user_id" });
  if (linkError) throw linkError;
  return { student: { id: student.id, name: student.display_name } };
}

async function studentProgress(userId: string, input: Record<string, unknown>) {
  const student = await studentFor(userId);
  let runsQuery = admin.from("activity_runs").select("*").eq("student_id", student.id);
  if (input.activityId) runsQuery = runsQuery.eq("activity_id", assertId(input.activityId, "activityId"));
  const [{ data: runs, error: runsError }, { data: visits, error: visitsError }, { data: access, error: accessError }] = await Promise.all([
    runsQuery.order("started_at"),
    admin.from("visits").select("activity_id, visited_at").eq("student_id", student.id),
    admin.from("activity_access").select("activity_id, solutions_released_at").eq("student_id", student.id),
  ]);
  if (runsError || visitsError || accessError) throw runsError || visitsError || accessError;
  const activityIds = new Set([...(runs || []).map((run) => run.activity_id), ...(visits || []).map((visit) => visit.activity_id)].filter(Boolean));
  const activities = [...activityIds].map((activityId) => {
    const activityRuns = (runs || []).filter((run) => run.activity_id === activityId).map(publicRun);
    const activityVisits = (visits || []).filter((visit) => visit.activity_id === activityId);
    const release = (access || []).find((item) => item.activity_id === activityId);
    return { activityId, runs: activityRuns, bestRun: bestRun(activityRuns as unknown as Array<Record<string, unknown>>), visitCount: activityVisits.length, lastVisitAt: activityVisits.sort((a, b) => String(b.visited_at).localeCompare(String(a.visited_at)))[0]?.visited_at || null, solutionsReleasedAt: release?.solutions_released_at || null };
  });
  return { student: { id: student.id, name: student.display_name }, activities };
}

async function openActivity(userId: string, input: Record<string, unknown>) {
  const student = await studentFor(userId);
  const activityId = input.activityId == null ? null : assertId(input.activityId, "activityId");
  const entryId = assertUuid(input.entryId, "entryId");
  if (activityId) {
    const { data: activity } = await admin.from("activities").select("id").eq("id", activityId).eq("active", true).maybeSingle();
    if (!activity) throw new PortalError("Работа не опубликована.", 404);
  }
  const { error } = await admin.from("visits").upsert({ student_id: student.id, activity_id: activityId, entry_id: entryId, path: typeof input.path === "string" ? input.path.slice(0, 500) : null }, { onConflict: "entry_id", ignoreDuplicates: true });
  if (error) throw error;
  return { recorded: true };
}

async function startRun(userId: string, input: Record<string, unknown>) {
  const student = await studentFor(userId);
  const activityId = assertId(input.activityId, "activityId");
  const variantId = assertId(input.variantId || "default", "variantId");
  const { data: activity } = await admin.from("activities").select("id, verification_mode").eq("id", activityId).eq("active", true).maybeSingle();
  if (!activity || activity.verification_mode !== "server-graded") throw new PortalError("Для этой работы автоматическая сдача не включена.");
  const { data: existing, error: existingError } = await admin.from("activity_runs").select("*").eq("student_id", student.id).eq("activity_id", activityId).order("run_no");
  if (existingError) throw existingError;
  const active = (existing || []).find((run) => run.status === "in_progress");
  if (active) {
    const { data: attempts } = await admin.from("answer_attempts").select("question_id, graded, correct, points").eq("run_id", active.id);
    return { ...publicRun(active), attempts: (attempts || []).map((item) => ({ questionId: item.question_id, graded: item.graded, correct: item.correct, points: Number(item.points) })) };
  }
  if ((existing || []).length >= 2) throw new PortalError("Обе доступные сдачи уже завершены.", 409);
  const { data: keys, error: keyError } = await admin.from("answer_keys").select("points").eq("activity_id", activityId).eq("variant_id", variantId);
  if (keyError) throw keyError;
  const maxPoints = (keys || []).reduce((sum, item) => sum + Number(item.points), 0);
  if (!(keys || []).length) throw new PortalError("Для выбранного варианта пока нет заданий для сохранения.");
  const { data: created, error } = await admin.from("activity_runs").insert({ student_id: student.id, activity_id: activityId, variant_id: variantId, run_no: (existing || []).length + 1, max_points: maxPoints }).select("*").single();
  if (error?.code === "23505") {
    const { data: concurrent } = await admin.from("activity_runs").select("*").eq("student_id", student.id).eq("activity_id", activityId).eq("status", "in_progress").maybeSingle();
    if (concurrent) return { ...publicRun(concurrent), attempts: [] };
    throw new PortalError("Обе доступные сдачи уже завершены.", 409);
  }
  if (error) throw error;
  return { ...publicRun(created), attempts: [] };
}

async function submitAnswer(userId: string, input: Record<string, unknown>) {
  const student = await studentFor(userId);
  const runId = assertUuid(input.runId, "runId");
  const attemptId = assertUuid(input.attemptId, "attemptId");
  const questionId = assertId(input.questionId, "questionId");
  if (!("answer" in input)) throw new PortalError("Ответ отсутствует.");
  const { data: duplicate } = await admin.from("answer_attempts").select("attempt_id, run_id, question_id, graded, correct, points").eq("attempt_id", attemptId).maybeSingle();
  if (duplicate) {
    if (duplicate.run_id !== runId || duplicate.question_id !== questionId) throw new PortalError("Идентификатор попытки уже использован.", 409);
    return { graded: duplicate.graded, correct: duplicate.correct, points: Number(duplicate.points), duplicate: true };
  }
  const { data: run, error: runError } = await admin.from("activity_runs").select("*").eq("id", runId).eq("student_id", student.id).maybeSingle();
  if (runError || !run) throw new PortalError("Сдача не найдена.", 404);
  if (run.status !== "in_progress") throw new PortalError("Эта сдача уже завершена.", 409);
  const { data: key, error: keyError } = await admin.from("answer_keys").select("matcher_type, expected_json, tolerance, points").eq("activity_id", run.activity_id).eq("variant_id", run.variant_id).eq("question_id", questionId).maybeSingle();
  if (keyError || !key) throw new PortalError("Этот вопрос не участвует в автоматической проверке.", 404);
  validateAnswer(key.matcher_type, input.answer);
  const graded = key.matcher_type !== "ungraded";
  const correct = graded ? matchesAnswer(key.matcher_type, input.answer, key.expected_json, Number(key.tolerance)) : null;
  const points = correct ? Number(key.points) : 0;
  const { data, error } = await admin.rpc("record_answer_attempt", {
    p_attempt_id: attemptId, p_run_id: runId, p_student_id: student.id, p_question_id: questionId,
    p_answer_json: input.answer, p_graded: graded, p_correct: correct, p_points: points,
  });
  if (error?.code === "23505" || error?.code === "P0001") throw new PortalError(error.message, 409);
  if (error?.code === "P0002") throw new PortalError("Сдача не найдена.", 404);
  if (error) throw error;
  return data;
}

async function submitRun(userId: string, input: Record<string, unknown>) {
  const student = await studentFor(userId);
  const runId = assertUuid(input.runId, "runId");
  const { data, error } = await admin.rpc("finish_activity_run", { p_run_id: runId, p_student_id: student.id });
  if (error?.code === "P0002") throw new PortalError("Сдача не найдена.", 404);
  if (error) throw error;
  return publicRun(data as Record<string, unknown>);
}

async function releasedSolutions(userId: string, input: Record<string, unknown>) {
  const student = await studentFor(userId);
  const activityId = assertId(input.activityId, "activityId");
  const variantId = assertId(input.variantId || "default", "variantId");
  const { data: access } = await admin.from("activity_access").select("solutions_released_at").eq("student_id", student.id).eq("activity_id", activityId).maybeSingle();
  if (!access?.solutions_released_at) return { released: false, solutions: [] };
  const { data, error } = await admin.from("answer_keys").select("question_id, solution_html").eq("activity_id", activityId).eq("variant_id", variantId).neq("solution_html", "").order("question_id");
  if (error) throw error;
  return { released: true, releasedAt: access.solutions_released_at, solutions: (data || []).map((item) => ({ questionId: item.question_id, solutionHtml: item.solution_html })) };
}

async function teacherSummary(userId: string, input: Record<string, unknown>) {
  await requireTeacher(userId);
  const { data: students, error: studentsError } = await admin.from("students").select("id, display_name, created_at, last_active_at, active").order("created_at");
  if (studentsError) throw studentsError;
  const requested = typeof input.studentId === "string" ? input.studentId : null;
  const selected = requested ? (students || []).find((item) => item.id === requested) : (students || []).find((item) => item.active) || students?.[0];
  const { data: activities, error: activitiesError } = await admin.from("activities").select("id").eq("active", true).order("id");
  if (activitiesError) throw activitiesError;
  if (!selected) return { student: null, studentCount: 0, totalVisits: 0, submittedRuns: 0, averageGrade: null, activities: [], attempts: [] };
  const [devicesResult, runsResult, accessResult] = await Promise.all([
    admin.from("student_devices").select("id").eq("student_id", selected.id),
    admin.from("activity_runs").select("*").eq("student_id", selected.id).order("started_at"),
    admin.from("activity_access").select("activity_id, solutions_released_at").eq("student_id", selected.id),
  ]);
  const queryError = [devicesResult, runsResult, accessResult].find((result) => result.error)?.error;
  if (queryError) throw queryError;
  const devices = devicesResult.data;
  const runs = runsResult.data;
  const access = accessResult.data;
  const visits: Array<{ activity_id: string | null; visited_at: string }> = [];
  for (let from = 0; ; from += 500) {
    const { data: page, error: pageError } = await admin.from("visits").select("activity_id, visited_at")
      .eq("student_id", selected.id).order("visited_at", { ascending: false }).range(from, from + 499);
    if (pageError) throw pageError;
    visits.push(...(page || []));
    if (!page || page.length < 500) break;
  }
  const attempts: Array<{ activity_id: string; question_id: string; answer_json: unknown; graded: boolean; correct: boolean | null; points: number | string; created_at: string }> = [];
  for (let from = 0; ; from += 500) {
    const { data: page, error: pageError } = await admin.from("answer_attempts")
      .select("activity_id, question_id, answer_json, graded, correct, points, created_at, activity_runs!inner(student_id)")
      .eq("activity_runs.student_id", selected.id).order("created_at", { ascending: false }).range(from, from + 499);
    if (pageError) throw pageError;
    attempts.push(...(page || []));
    if (!page || page.length < 500) break;
  }
  const rows = (activities || []).map((activity) => {
    const activityRuns = (runs || []).filter((run) => run.activity_id === activity.id).map(publicRun);
    const activityVisits = (visits || []).filter((visit) => visit.activity_id === activity.id);
    const release = (access || []).find((item) => item.activity_id === activity.id);
    return { activityId: activity.id, runs: activityRuns, bestRun: bestRun(activityRuns as unknown as Array<Record<string, unknown>>), visitCount: activityVisits.length, lastVisitAt: activityVisits.sort((a, b) => String(b.visited_at).localeCompare(String(a.visited_at)))[0]?.visited_at || null, solutionsReleasedAt: release?.solutions_released_at || null };
  });
  const official = rows.map((row) => row.bestRun).filter((run) => run?.grade != null) as Array<{ grade: number }>;
  return {
    student: { id: selected.id, name: selected.display_name, active: selected.active, createdAt: selected.created_at, lastActiveAt: selected.last_active_at, deviceCount: devices?.length || 0 },
    studentCount: students?.length || 0,
    totalVisits: visits?.length || 0,
    submittedRuns: (runs || []).filter((run) => run.status === "submitted").length,
    averageGrade: official.length ? Math.round(official.reduce((sum, run) => sum + Number(run.grade), 0) / official.length * 10) / 10 : null,
    activities: rows,
    attempts: (attempts || []).map((item) => ({ activityId: item.activity_id, questionId: item.question_id, answerPreview: JSON.stringify(item.answer_json).slice(0, 120), graded: item.graded, correct: item.correct, points: Number(item.points), createdAt: item.created_at })),
  };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

async function teacherAdmin(userId: string, input: Record<string, unknown>) {
  await requireTeacher(userId);
  const action = input.action;
  if (action === "create_student") {
    const displayName = typeof input.name === "string" ? input.name.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
    if (!displayName || displayName.length > 80) throw new PortalError("Введите имя ученика.");
    const code = newCode();
    const { data, error } = await admin.from("students").insert({ display_name: displayName, normalized_name: normalizeName(displayName), code_hash: await hashCode(code) }).select("id, display_name").single();
    if (error) throw error;
    return { student: { id: data.id, name: data.display_name }, code };
  }
  const studentId = assertUuid(input.studentId, "studentId");
  const { data: student } = await admin.from("students").select("id, display_name").eq("id", studentId).maybeSingle();
  if (!student) throw new PortalError("Ученик не найден.", 404);
  if (action === "reset_code") {
    const code = newCode();
    const { data: devices, error: devicesError } = await admin.from("student_devices").select("auth_user_id").eq("student_id", studentId);
    if (devicesError) throw devicesError;
    const { error } = await admin.rpc("reset_student_access", { p_student_id: studentId, p_code_hash: await hashCode(code) });
    if (error) throw error;
    for (const device of devices || []) {
      const { error: authError } = await admin.auth.admin.deleteUser(device.auth_user_id);
      if (authError && !/not found/i.test(authError.message)) console.warn("Не удалось удалить отвязанный Auth-профиль", device.auth_user_id, authError.message);
    }
    return { code };
  }
  if (action === "delete_student") {
    const { data: devices, error: devicesError } = await admin.from("student_devices").select("auth_user_id").eq("student_id", studentId);
    if (devicesError) throw devicesError;
    const { error } = await admin.from("students").delete().eq("id", studentId);
    if (error) throw error;
    for (const device of devices || []) {
      const { error: authError } = await admin.auth.admin.deleteUser(device.auth_user_id);
      if (authError && !/not found/i.test(authError.message)) console.warn("Не удалось удалить анонимного Auth-пользователя", device.auth_user_id, authError.message);
    }
    return { deleted: true };
  }
  if (action === "release_solutions" || action === "hide_solutions") {
    const activityId = assertId(input.activityId, "activityId");
    const released = action === "release_solutions" ? new Date().toISOString() : null;
    const { error } = await admin.from("activity_access").upsert({ student_id: studentId, activity_id: activityId, solutions_released_at: released, released_by: userId }, { onConflict: "student_id,activity_id" });
    if (error) throw error;
    return { solutionsReleasedAt: released };
  }
  throw new PortalError("Неизвестное действие.");
}

export async function handle(req: Request, operation: Operation) {
  try {
    const headers = cors(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers });
    if (!originAllowed(req)) throw new PortalError("Этот адрес сайта не разрешён.", 403);
    if (req.method !== "POST") return json(req, { error: "Метод не поддерживается." }, 405);
    if (!supabaseUrl || !secretKey) throw new PortalError("Сервер Supabase не настроен.", 500);
    const user = await currentUser(req);
    const input = await body(req);
    let result: unknown;
    if (operation === "claim-student") result = await claimStudent(req, user.id, input);
    else if (operation === "student-progress") result = await studentProgress(user.id, input);
    else if (operation === "open-activity") result = await openActivity(user.id, input);
    else if (operation === "start-run") result = await startRun(user.id, input);
    else if (operation === "submit-answer") result = await submitAnswer(user.id, input);
    else if (operation === "submit-run") result = await submitRun(user.id, input);
    else if (operation === "released-solutions") result = await releasedSolutions(user.id, input);
    else if (operation === "teacher-summary") result = await teacherSummary(user.id, input);
    else result = await teacherAdmin(user.id, input);
    return json(req, result);
  } catch (error) {
    console.error(operation, error);
    const message = error instanceof PortalError ? error.message : "Сервер не смог выполнить запрос.";
    const status = error instanceof PortalError ? error.status : 500;
    return json(req, { error: message }, status);
  }
}
