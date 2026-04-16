const canvas = document.querySelector("[data-canvas]");
const inspector = document.querySelector("[data-inspector]");
const counts = document.querySelector("[data-counts]");
const tabs = Array.from(document.querySelectorAll(".tab"));
const themeToggle = document.querySelector("[data-theme-toggle]");
const popupBackdrop = document.querySelector("[data-code-popup]");
const popupClose = document.querySelector("[data-popup-close]");
const popupTitle = document.querySelector("[data-popup-title]");
const popupBody = document.querySelector("[data-popup-body]");

if (!(canvas instanceof HTMLElement) || !(inspector instanceof HTMLElement)) {
  throw new Error("Architecture map mount nodes are missing.");
}

if (!(popupBackdrop instanceof HTMLElement) || !(popupBody instanceof HTMLElement) || !(popupTitle instanceof HTMLElement)) {
  throw new Error("Architecture map source popup nodes are missing.");
}

const state = {
  view: "topology",
  topology: null,
  flow: null,
  selected: null,
};

const sourceFileCache = new Map();
const THEME_MODES = ["auto", "light", "dark"];
const THEME_STORAGE_KEY = "architecture-map:theme-mode";
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load ${path} (${response.status}).`);
  }
  return response.json();
}

function renderMetadata(meta = {}) {
  return `
    <section class="meta-block">
      <p class="meta-line"><strong>${meta.title || "Untitled"}</strong></p>
      <p class="meta-line">lastVerifiedCommit: <code>${meta.lastVerifiedCommit || "n/a"}</code></p>
      <p class="meta-line">verifiedOnUtc: <code>${meta.verifiedOnUtc || "n/a"}</code></p>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSourceRefs(sourceRefs = []) {
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    return "<li class='muted'>No source refs.</li>";
  }

  return sourceRefs
    .map((ref) => {
      const confidence = String(ref.confidence || "inferred");
      const badgeClass = confidence === "exact" ? "badge badge--exact" : "badge badge--inferred";
      const sourceFile = String(ref.file || "");
      const sourceLine = Number(ref.line) || 0;
      return `
        <li>
          <span class="${badgeClass}">${escapeHtml(confidence)}</span>
          <button
            class="ref-link ref"
            type="button"
            data-source-file="${escapeHtml(sourceFile)}"
            data-source-line="${sourceLine}"
          >${escapeHtml(sourceFile || "unknown")}:${sourceLine}</button>
        </li>
      `;
    })
    .join("");
}

function setInspectorHtml(html) {
  inspector.innerHTML = `
    <h2>Inspector</h2>
    ${html}
  `;
}

function setSelected(kind, id) {
  state.selected = { kind, id };
}

function isSelected(kind, id) {
  return Boolean(state.selected && state.selected.kind === kind && state.selected.id === id);
}

function renderCounts() {
  if (!(counts instanceof HTMLElement)) {
    return;
  }

  if (state.view === "topology" && state.topology) {
    const nodeCount = Array.isArray(state.topology.nodes) ? state.topology.nodes.length : 0;
    const edgeCount = Array.isArray(state.topology.edges) ? state.topology.edges.length : 0;
    const groupCount = Array.isArray(state.topology.groups) ? state.topology.groups.length : 0;
    counts.innerHTML = `
      <span class="chip">${groupCount} groups</span>
      <span class="chip">${nodeCount} nodes</span>
      <span class="chip">${edgeCount} edges</span>
    `;
    return;
  }

  if (state.view === "sequence" && state.flow) {
    const stepCount = Array.isArray(state.flow.steps) ? state.flow.steps.length : 0;
    counts.innerHTML = `
      <span class="chip">${stepCount} sequence steps</span>
      <span class="chip">prompt inspector enabled</span>
    `;
    return;
  }

  counts.innerHTML = "";
}

function inspectNode(node) {
  setInspectorHtml(`
    <p><strong>${escapeHtml(node.label)}</strong></p>
    <p>${escapeHtml(node.summary)}</p>
    <p class="muted">${escapeHtml(node.details)}</p>
    <h3>Source Anchors</h3>
    <ul class="list">${renderSourceRefs(node.sourceRefs)}</ul>
  `);
}

function inspectEdge(edge) {
  setInspectorHtml(`
    <p><strong>Edge: ${escapeHtml(edge.id)}</strong></p>
    <p><code>${escapeHtml(edge.from)}</code> -> <code>${escapeHtml(edge.to)}</code></p>
    <p>${escapeHtml(edge.label || "")}</p>
    <p class="muted">${escapeHtml(edge.details || "")}</p>
    <h3>Source Anchors</h3>
    <ul class="list">${renderSourceRefs(edge.sourceRefs)}</ul>
  `);
}

function inspectStep(step) {
  const failures = Array.isArray(step.failureModes)
    ? step.failureModes.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")
    : "";

  setInspectorHtml(`
    <p class="step-stage">${escapeHtml(step.stage)}</p>
    <p><strong>${escapeHtml(step.id)} - ${escapeHtml(step.label)}</strong></p>
    <p>${escapeHtml(step.description)}</p>
    <p><strong>Input:</strong> ${escapeHtml(step.input || "")}</p>
    <p><strong>Output:</strong> ${escapeHtml(step.output || "")}</p>
    <h3>Failure Modes</h3>
    <ul class="list">${failures || "<li>None documented.</li>"}</ul>
    <h3>Source Anchors</h3>
    <ul class="list">${renderSourceRefs(step.sourceRefs)}</ul>
  `);
}

function renderTopology() {
  const data = state.topology;
  if (!data) {
    return;
  }

  const groupNodes = new Map();
  for (const group of data.groups || []) {
    groupNodes.set(group.id, []);
  }

  for (const node of data.nodes || []) {
    if (!groupNodes.has(node.group)) {
      groupNodes.set(node.group, []);
    }
    groupNodes.get(node.group).push(node);
  }

  const groupHtml = (data.groups || [])
    .map((group) => {
      const nodes = groupNodes.get(group.id) || [];
      const cards = nodes
        .map(
          (node) => `
            <button class="card ${isSelected("node", node.id) ? "is-active" : ""}" type="button" data-node-id="${escapeHtml(node.id)}">
              <h3>${escapeHtml(node.label)}</h3>
              <p>${escapeHtml(node.summary)}</p>
            </button>
          `,
        )
        .join("");

      return `
        <section class="group">
          <header>${escapeHtml(group.label)}</header>
          <div class="group-body">${cards}</div>
        </section>
      `;
    })
    .join("");

  const edgeHtml = (data.edges || [])
    .map(
      (edge) => `
        <button class="edge ${isSelected("edge", edge.id) ? "is-active" : ""}" type="button" data-edge-id="${escapeHtml(edge.id)}">
          <strong>${escapeHtml(edge.id)}</strong>: <code>${escapeHtml(edge.from)}</code> -> <code>${escapeHtml(edge.to)}</code>
          <div class="muted">${escapeHtml(edge.label || "")}</div>
        </button>
      `,
    )
    .join("");

  canvas.innerHTML = `
    ${renderMetadata(data.metadata)}
    <section class="group-grid">${groupHtml}</section>
    <section class="edges">
      <h3>Flow Edges</h3>
      ${edgeHtml}
    </section>
  `;

  for (const nodeButton of canvas.querySelectorAll("[data-node-id]")) {
    nodeButton.addEventListener("click", () => {
      const nodeId = nodeButton.getAttribute("data-node-id");
      const node = (data.nodes || []).find((entry) => entry.id === nodeId);
      if (node) {
        setSelected("node", node.id);
        renderTopology();
        inspectNode(node);
      }
    });
  }

  for (const edgeButton of canvas.querySelectorAll("[data-edge-id]")) {
    edgeButton.addEventListener("click", () => {
      const edgeId = edgeButton.getAttribute("data-edge-id");
      const edge = (data.edges || []).find((entry) => entry.id === edgeId);
      if (edge) {
        setSelected("edge", edge.id);
        renderTopology();
        inspectEdge(edge);
      }
    });
  }
}

function inspectPromptModel(promptInspector = {}) {
  const toList = (entries = []) =>
    entries.map((entry) => `<li>${escapeHtml(typeof entry === "string" ? entry : JSON.stringify(entry))}</li>`).join("");

  setInspectorHtml(`
    <p><strong>Prompt Inspector</strong></p>
    <h3>System Prompt Sections</h3>
    <ul class="list">${toList(promptInspector.systemPromptSections || [])}</ul>
    <h3>Request Payload</h3>
    <ul class="list">${toList((promptInspector.requestPayloadFields || []).map((f) => `${f.name}: ${f.purpose}`))}</ul>
    <h3>Response Contract</h3>
    <ul class="list">${toList((promptInspector.responseContract || []).map((f) => `${f.field} (${f.type}) - ${f.note}`))}</ul>
    <h3>Guardrails</h3>
    <ul class="list">${toList(promptInspector.guardrails || [])}</ul>
  `);
}

function renderSequence() {
  const data = state.flow;
  if (!data) {
    return;
  }

  const stepsHtml = (data.steps || [])
    .map(
      (step) => `
        <button class="step ${isSelected("step", step.id) ? "is-active" : ""}" type="button" data-step-id="${escapeHtml(step.id)}">
          <div class="step-stage">${escapeHtml(step.stage)}</div>
          <h3>${escapeHtml(step.id)} - ${escapeHtml(step.label)}</h3>
          <p>${escapeHtml(step.description)}</p>
        </button>
      `,
    )
    .join("");

  canvas.innerHTML = `
    ${renderMetadata(data.metadata)}
    ${stepsHtml}
  `;

  for (const stepButton of canvas.querySelectorAll("[data-step-id]")) {
    stepButton.addEventListener("click", () => {
      const stepId = stepButton.getAttribute("data-step-id");
      const step = (data.steps || []).find((entry) => entry.id === stepId);
      if (step) {
        setSelected("step", step.id);
        renderSequence();
        inspectStep(step);
      }
    });
  }

  if (!state.selected || state.selected.kind !== "step") {
    inspectPromptModel(data.promptInspector);
  }
}

function render() {
  if (state.view === "topology") {
    renderTopology();
    if (!state.selected || (state.selected.kind !== "node" && state.selected.kind !== "edge")) {
      setInspectorHtml("<p class='muted'>Select a topology node or edge to inspect details and source traceability.</p>");
    }
    renderCounts();
    return;
  }

  renderSequence();
  renderCounts();
}

function getSavedThemeMode() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && THEME_MODES.includes(saved)) {
    return saved;
  }
  return "auto";
}

function resolveTheme(mode) {
  if (mode === "light" || mode === "dark") {
    return mode;
  }
  return systemDarkQuery.matches ? "dark" : "light";
}

function renderThemeToggle(mode) {
  if (!(themeToggle instanceof HTMLButtonElement)) {
    return;
  }
  const effective = resolveTheme(mode);
  themeToggle.textContent = `Theme: ${mode[0].toUpperCase()}${mode.slice(1)} (${effective})`;
}

function applyTheme(mode) {
  const nextMode = THEME_MODES.includes(mode) ? mode : "auto";
  document.documentElement.setAttribute("data-theme-mode", nextMode);
  if (nextMode === "auto") {
    document.documentElement.setAttribute("data-theme", resolveTheme(nextMode));
  } else {
    document.documentElement.setAttribute("data-theme", nextMode);
  }
  localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  renderThemeToggle(nextMode);
}

function cycleThemeMode() {
  const current = document.documentElement.getAttribute("data-theme-mode") || "auto";
  const index = THEME_MODES.indexOf(current);
  const next = THEME_MODES[(index + 1) % THEME_MODES.length];
  applyTheme(next);
}

async function getSourceText(path) {
  if (sourceFileCache.has(path)) {
    return sourceFileCache.get(path);
  }
  const response = await fetch(`./${path}`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load source file ${path} (${response.status}).`);
  }
  const text = await response.text();
  sourceFileCache.set(path, text);
  return text;
}

function renderSnippet(source, lineNumber) {
  const allLines = source.split(/\r?\n/);
  const safeLine = Math.min(Math.max(1, lineNumber || 1), Math.max(1, allLines.length));
  const from = Math.max(1, safeLine - 6);
  const to = Math.min(allLines.length, safeLine + 6);
  const snippetLines = [];

  for (let lineIndex = from; lineIndex <= to; lineIndex += 1) {
    const text = allLines[lineIndex - 1] ?? "";
    const highlighted = lineIndex === safeLine ? " is-highlight" : "";
    snippetLines.push(
      `<span class="code-line${highlighted}" data-snippet-line="${lineIndex}"><span class="code-line-number">${lineIndex
        .toString()
        .padStart(4, " ")}</span>${escapeHtml(text)}</span>`,
    );
  }

  return snippetLines.join("");
}

async function openSourcePopup(path, lineNumber) {
  popupTitle.textContent = `${path}:${lineNumber}`;
  popupBody.innerHTML = `<span class="code-line">Loading source snippet...</span>`;
  popupBackdrop.hidden = false;

  try {
    const source = await getSourceText(path);
    popupBody.innerHTML = renderSnippet(source, lineNumber);
    const focused = popupBody.querySelector(`[data-snippet-line="${Number(lineNumber) || 1}"]`);
    if (focused instanceof HTMLElement) {
      focused.scrollIntoView({ block: "center", behavior: "auto" });
    }
  } catch (error) {
    popupBody.innerHTML = `<span class="code-line">${escapeHtml(error instanceof Error ? error.message : "Failed to load source.")}</span>`;
  }
}

function closeSourcePopup() {
  popupBackdrop.hidden = true;
}

function setView(nextView) {
  state.view = nextView;
  state.selected = null;
  for (const tab of tabs) {
    const isActive = tab.getAttribute("data-view") === state.view;
    tab.classList.toggle("tab--active", isActive);
  }
  render();
}

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const nextView = tab.getAttribute("data-view");
    if (nextView && nextView !== state.view) {
      setView(nextView);
    }
  });
}

inspector.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-source-file]") : null;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const file = target.getAttribute("data-source-file");
  const line = Number(target.getAttribute("data-source-line")) || 1;
  if (!file) {
    return;
  }
  void openSourcePopup(file, line);
});

if (themeToggle instanceof HTMLButtonElement) {
  themeToggle.addEventListener("click", cycleThemeMode);
}

if (popupClose instanceof HTMLButtonElement) {
  popupClose.addEventListener("click", closeSourcePopup);
}

popupBackdrop.addEventListener("click", (event) => {
  if (event.target === popupBackdrop) {
    closeSourcePopup();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !popupBackdrop.hidden) {
    closeSourcePopup();
  }
});

systemDarkQuery.addEventListener("change", () => {
  if ((document.documentElement.getAttribute("data-theme-mode") || "auto") === "auto") {
    applyTheme("auto");
  }
});

async function boot() {
  try {
    applyTheme(getSavedThemeMode());
    const [topology, flow] = await Promise.all([
      loadJson("./src/architecture-map/data/architecture.json"),
      loadJson("./src/architecture-map/data/llm-flow.json"),
    ]);

    state.topology = topology;
    state.flow = flow;
    render();
  } catch (error) {
    canvas.innerHTML = `<p class="danger">${escapeHtml(error instanceof Error ? error.message : "Map failed to load.")}</p>`;
  }
}

void boot();
