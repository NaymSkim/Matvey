(() => {
  function init() {
  const legacyPanel = document.querySelector("#board-panel, #board");
  const legacyTrigger = document.querySelector("#board-fab, #board-button");
  if (!legacyPanel || !legacyTrigger) return;

  const storageKey = `physics-sketch-v1:${location.pathname}`;
  const colors = [
    ["#172033", "Тёмный"], ["#2563eb", "Синий"], ["#c33c3c", "Красный"],
    ["#168653", "Зелёный"], ["#ea580c", "Оранжевый"], ["#7c3aed", "Фиолетовый"],
  ];
  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "sketch-launch";
  launch.id = "sketch-launch";
  launch.setAttribute("aria-label", "Открыть черновик для рисунков");
  launch.setAttribute("aria-controls", "sketch-panel");
  launch.setAttribute("aria-expanded", "false");
  launch.innerHTML = '<span class="sketch-launch-icon" aria-hidden="true">✏️</span><span>Черновик</span>';

  const panel = document.createElement("section");
  panel.id = "sketch-panel";
  panel.className = "sketch-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Черновик для решения задач");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="sketch-header" id="sketch-header">
      <div class="sketch-heading"><strong>✏️ Черновик для решения</strong><small>Нарисуй схему, силы или график</small></div>
      <div class="sketch-header-actions">
        <button class="sketch-icon-button" type="button" data-action="expand" title="Развернуть" aria-label="Развернуть доску">⤢</button>
        <button class="sketch-icon-button" type="button" data-action="close" title="Закрыть" aria-label="Закрыть черновик">×</button>
      </div>
    </header>
    <div class="sketch-toolbar">
      <div class="sketch-tool-group" role="group" aria-label="Инструмент">
        <span class="sketch-group-label">Инструмент</span>
        <button class="sketch-tool" type="button" data-tool="pen" aria-pressed="true">✏️ Карандаш</button>
        <button class="sketch-tool" type="button" data-tool="marker" aria-pressed="false">🖍️ Маркер</button>
        <button class="sketch-tool" type="button" data-tool="eraser" aria-pressed="false">◻ Ластик</button>
      </div>
      <div class="sketch-tool-group" role="group" aria-label="Цвет">
        <span class="sketch-group-label">Цвет</span>
        ${colors.map(([value, name], index) => `<button class="sketch-color" type="button" data-color="${value}" aria-label="${name}" title="${name}" aria-pressed="${index === 0}" style="background:${value}"></button>`).join("")}
      </div>
      <div class="sketch-tool-group" role="group" aria-label="Толщина линии">
        <span class="sketch-group-label">Толщина</span>
        <button class="sketch-size" type="button" data-size="2" aria-pressed="true">Тонкая</button>
        <button class="sketch-size" type="button" data-size="5" aria-pressed="false">Средняя</button>
        <button class="sketch-size" type="button" data-size="10" aria-pressed="false">Толстая</button>
      </div>
    </div>
    <div class="sketch-canvas-wrap">
      <canvas class="sketch-canvas" aria-label="Область для рисунка"></canvas>
      <div class="sketch-hint">Проведи пальцем или мышью по доске. Рисунок сохранится на этом устройстве.</div>
    </div>
    <footer class="sketch-footer">
      <span class="sketch-status" role="status">Черновик сохраняется на этом устройстве</span>
      <div class="sketch-footer-actions">
        <button class="sketch-action" type="button" data-action="undo" title="Отменить последнее действие">↶ Отменить</button>
        <button class="sketch-action" type="button" data-action="redo" title="Вернуть действие">↷ Вернуть</button>
        <button class="sketch-action" type="button" data-action="download" title="Сохранить рисунок как PNG">↓ Скачать</button>
        <button class="sketch-action is-danger" type="button" data-action="clear" title="Очистить доску. Можно отменить">Очистить</button>
      </div>
    </footer>
    <div class="sketch-resize" aria-label="Изменить размер доски" title="Изменить размер"></div>`;

  legacyTrigger.replaceWith(launch);
  legacyPanel.remove();
  document.querySelector("#board-overlay")?.remove();
  document.body.append(panel);

  const canvas = panel.querySelector("canvas");
  const wrap = panel.querySelector(".sketch-canvas-wrap");
  const hint = panel.querySelector(".sketch-hint");
  const status = panel.querySelector(".sketch-status");
  const context = canvas.getContext("2d");
  let strokes = [];
  let redoStack = [];
  let activeStroke = null;
  let tool = "pen";
  let color = colors[0][0];
  let size = 2;
  let expanded = false;
  let savedGeometry = null;
  let geometryGesture = null;
  let renderQueued = false;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) strokes = saved.filter((stroke) => stroke && (stroke.tool === "clear" || Array.isArray(stroke.points)));
  } catch { /* The drawing remains available without local storage. */ }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(strokes));
      status.textContent = "Черновик сохранён на этом устройстве ✓";
    } catch { status.textContent = "Рисунок есть только до закрытия страницы"; }
  }

  function refreshControls() {
    panel.querySelector('[data-action="undo"]').disabled = strokes.length === 0;
    panel.querySelector('[data-action="redo"]').disabled = redoStack.length === 0;
    const lastClear = strokes.findLastIndex((stroke) => stroke.tool === "clear");
    hint.hidden = strokes.slice(lastClear + 1).some((stroke) => stroke.tool === "pen" || stroke.tool === "marker") || Boolean(activeStroke);
  }

  function drawStroke(stroke) {
    if (stroke.tool === "clear") {
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      return;
    }
    const points = stroke.points || [];
    if (!points.length) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.save();
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.globalAlpha = stroke.tool === "marker" ? .28 : 1;
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.size * (stroke.tool === "eraser" ? 5 : stroke.tool === "marker" ? 3 : 1);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    if (points.length === 1) {
      context.arc(points[0][0] * width, points[0][1] * height, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.moveTo(points[0][0] * width, points[0][1] * height);
      for (let index = 1; index < points.length; index += 1) context.lineTo(points[index][0] * width, points[index][1] * height);
      context.stroke();
    }
    context.restore();
  }

  function redraw() {
    renderQueued = false;
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    strokes.forEach(drawStroke);
    if (activeStroke) drawStroke(activeStroke);
    refreshControls();
  }

  function queueRedraw() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(redraw);
  }

  function resizeCanvas() {
    if (panel.hidden) return;
    const rect = wrap.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    queueRedraw();
  }

  new ResizeObserver(resizeCanvas).observe(wrap);

  function open() {
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    requestAnimationFrame(resizeCanvas);
    queueRedraw();
    refreshControls();
    panel.querySelector('[data-tool="pen"]').focus();
  }

  function close() {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }

  function toggle() { if (panel.hidden) open(); else close(); }

  function expand() {
    if (!expanded) {
      savedGeometry = { left: panel.style.left, top: panel.style.top, right: panel.style.right, bottom: panel.style.bottom, width: panel.style.width, height: panel.style.height };
      panel.classList.add("is-expanded");
      expanded = true;
    } else {
      panel.classList.remove("is-expanded");
      Object.assign(panel.style, savedGeometry || {});
      expanded = false;
    }
    const button = panel.querySelector('[data-action="expand"]');
    button.textContent = expanded ? "⤡" : "⤢";
    button.title = expanded ? "Свернуть" : "Развернуть";
    button.setAttribute("aria-label", button.title + " доску");
    requestAnimationFrame(resizeCanvas);
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))];
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    activeStroke = { tool, color, size, points: [point(event)] };
    queueRedraw();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!activeStroke) return;
    event.preventDefault();
    const next = point(event);
    const last = activeStroke.points.at(-1);
    if (Math.hypot((next[0] - last[0]) * canvas.clientWidth, (next[1] - last[1]) * canvas.clientHeight) < 1.5) return;
    activeStroke.points.push(next);
    queueRedraw();
  });
  function finishStroke(event) {
    if (!activeStroke) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    strokes.push(activeStroke);
    activeStroke = null;
    redoStack = [];
    save();
    queueRedraw();
  }
  canvas.addEventListener("pointerup", finishStroke);
  canvas.addEventListener("pointercancel", finishStroke);

  launch.addEventListener("click", toggle);
  panel.addEventListener("click", (event) => {
    const option = event.target.closest("button");
    if (!option) return;
    if (option.dataset.tool) {
      tool = option.dataset.tool;
      panel.querySelectorAll("[data-tool]").forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
      canvas.classList.toggle("is-eraser", tool === "eraser");
    } else if (option.dataset.color) {
      color = option.dataset.color;
      panel.querySelectorAll("[data-color]").forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
      if (tool === "eraser") panel.querySelector('[data-tool="pen"]').click();
    } else if (option.dataset.size) {
      size = Number(option.dataset.size);
      panel.querySelectorAll("[data-size]").forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
    } else if (option.dataset.action === "close") close();
    else if (option.dataset.action === "expand") expand();
    else if (option.dataset.action === "undo" && strokes.length) { redoStack.push(strokes.pop()); save(); queueRedraw(); }
    else if (option.dataset.action === "redo" && redoStack.length) { strokes.push(redoStack.pop()); save(); queueRedraw(); }
    else if (option.dataset.action === "clear" && strokes.length) { strokes.push({ tool: "clear" }); redoStack = []; save(); queueRedraw(); }
    else if (option.dataset.action === "download") {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportContext = exportCanvas.getContext("2d");
      exportContext.fillStyle = "#fffefa";
      exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportContext.drawImage(canvas, 0, 0);
      const link = document.createElement("a");
      link.href = exportCanvas.toDataURL("image/png");
      link.download = "chernovik-fizika.png";
      link.click();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (panel.hidden) return;
    if (event.key === "Escape") { close(); return; }
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    if (event.target.closest("input, textarea, [contenteditable]")) return;
    event.preventDefault();
    panel.querySelector(event.shiftKey ? '[data-action="redo"]' : '[data-action="undo"]').click();
  });

  const header = panel.querySelector("#sketch-header");
  const resizeHandle = panel.querySelector(".sketch-resize");
  function startGeometry(event, kind) {
    if (window.innerWidth <= 680 || expanded) return;
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    geometryGesture = { kind, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  header.addEventListener("pointerdown", (event) => { if (!event.target.closest("button")) startGeometry(event, "move"); });
  resizeHandle.addEventListener("pointerdown", (event) => startGeometry(event, "resize"));
  document.addEventListener("pointermove", (event) => {
    if (!geometryGesture) return;
    const dx = event.clientX - geometryGesture.startX;
    const dy = event.clientY - geometryGesture.startY;
    if (geometryGesture.kind === "move") {
      panel.style.left = `${Math.max(0, Math.min(window.innerWidth - geometryGesture.width, geometryGesture.left + dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(window.innerHeight - geometryGesture.height, geometryGesture.top + dy))}px`;
    } else {
      panel.style.width = `${Math.max(320, Math.min(window.innerWidth - geometryGesture.left, geometryGesture.width + dx))}px`;
      panel.style.height = `${Math.max(320, Math.min(window.innerHeight - geometryGesture.top, geometryGesture.height + dy))}px`;
    }
  });
  document.addEventListener("pointerup", () => { geometryGesture = null; });

  document.querySelectorAll(".board-open").forEach((button) => {
    button.onclick = null;
    button.addEventListener("click", open);
  });
  refreshControls();
  }
  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
