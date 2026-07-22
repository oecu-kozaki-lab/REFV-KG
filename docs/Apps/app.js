"use strict";

const fields = ["sLabel", "pLabel", "oLabel", "stClassLabel", "stLabel", "opText", "tText", "prefLabel", "docTypeLabel", "docLabel"];
const state = { all: [], filtered: [], page: 1, pageSize: 50, sortIndex: null, sortDirection: "asc" };
const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

const ui = {
  status: document.querySelector("#status"),
  search: document.querySelector("#searchInput"),
  pageSize: document.querySelector("#pageSize"),
  clear: document.querySelector("#clearButton"),
  file: document.querySelector("#fileInput"),
  help: document.querySelector("#loadHelp"),
  body: document.querySelector("#tableBody"),
  empty: document.querySelector("#emptyState"),
  prev: document.querySelector("#prevButton"),
  next: document.querySelector("#nextButton"),
  pageInfo: document.querySelector("#pageInfo"),
  prefectureFilter: document.querySelector("#prefectureFilter"),
  documentTypeFilter: document.querySelector("#documentTypeFilter"),
  subjectObjectFilter: document.querySelector("#subjectObjectFilter"),
  relationFilter: document.querySelector("#relationFilter"),
  speakerClassFilter: document.querySelector("#speakerClassFilter"),
  speakerFilter: document.querySelector("#speakerFilter"),
  clearFilters: document.querySelector("#clearFiltersButton"),
  dialog: document.querySelector("#textDialog"),
  dialogPrefecture: document.querySelector("#dialogPrefecture"),
  dialogDocumentType: document.querySelector("#dialogDocumentType"),
  dialogDocLabel: document.querySelector("#dialogDocLabel"),
  dialogText: document.querySelector("#dialogText"),
  dialogTriple: document.querySelector("#dialogTriple"),
  dialogSpeakerClass: document.querySelector("#dialogSpeakerClass"),
  dialogSpeaker: document.querySelector("#dialogSpeaker"),
  dialogOpinion: document.querySelector("#dialogOpinion")
};

const valueOf = (binding, key) => binding?.[key]?.value ?? "";

function normalize(data) {
  const bindings = data?.results?.bindings;
  if (!Array.isArray(bindings)) throw new Error("results.bindings が見つかりません。");
  return bindings.map((binding, sourceIndex) => ({
    sourceIndex,
    values: fields.map((field) => valueOf(binding, field))
  }));
}

function setData(data) {
  state.all = normalize(data);
  state.page = 1;
  ui.help.hidden = true;
  buildFilterOptions();
  applyFilter();
}

function countValues(valueLists) {
  const counts = new Map();
  valueLists.forEach((values) => {
    new Set(values.filter(Boolean)).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
}

function fillSelect(select, entries, total) {
  const selected = select.value;
  if (selected && !entries.some(([value]) => value === selected)) entries.push([selected, 0]);
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
  const fragment = document.createDocumentFragment();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = `すべて（${total.toLocaleString("ja-JP")}件）`;
  fragment.append(allOption);
  entries.forEach(([value, count]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${value}（${count.toLocaleString("ja-JP")}件）`;
    fragment.append(option);
  });
  select.replaceChildren(fragment);
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

function matchesListFilters(row, excluded = "") {
  const prefecture = ui.prefectureFilter.value;
  const documentType = ui.documentTypeFilter.value;
  const subjectObject = ui.subjectObjectFilter.value;
  const relation = ui.relationFilter.value;
  const speakerClass = ui.speakerClassFilter.value;
  const speaker = ui.speakerFilter.value;
  return (
    (excluded === "prefecture" || !prefecture || row.values[7] === prefecture) &&
    (excluded === "documentType" || !documentType || row.values[8] === documentType) &&
    (excluded === "subjectObject" || !subjectObject || row.values[0] === subjectObject || row.values[2] === subjectObject) &&
    (excluded === "relation" || !relation || row.values[1] === relation) &&
    (excluded === "speakerClass" || !speakerClass || row.values[3] === speakerClass) &&
    (excluded === "speaker" || !speaker || row.values[4] === speaker)
  );
}

function buildFilterOptions() {
  const prefectureRows = state.all.filter((row) => matchesListFilters(row, "prefecture"));
  const documentTypeRows = state.all.filter((row) => matchesListFilters(row, "documentType"));
  const subjectObjectRows = state.all.filter((row) => matchesListFilters(row, "subjectObject"));
  const relationRows = state.all.filter((row) => matchesListFilters(row, "relation"));
  const speakerClassRows = state.all.filter((row) => matchesListFilters(row, "speakerClass"));
  const speakerRows = state.all.filter((row) => matchesListFilters(row, "speaker"));
  fillSelect(ui.prefectureFilter, countValues(prefectureRows.map((row) => [row.values[7]])), prefectureRows.length);
  fillSelect(ui.documentTypeFilter, countValues(documentTypeRows.map((row) => [row.values[8]])), documentTypeRows.length);
  fillSelect(ui.subjectObjectFilter, countValues(subjectObjectRows.map((row) => [row.values[0], row.values[2]])), subjectObjectRows.length);
  fillSelect(ui.relationFilter, countValues(relationRows.map((row) => [row.values[1]])), relationRows.length);
  fillSelect(ui.speakerClassFilter, countValues(speakerClassRows.map((row) => [row.values[3]])), speakerClassRows.length);
  fillSelect(ui.speakerFilter, countValues(speakerRows.map((row) => [row.values[4]])), speakerRows.length);
}

function applyFilter() {
  buildFilterOptions();
  const terms = ui.search.value.trim().toLocaleLowerCase("ja").split(/\s+/).filter(Boolean);
  const prefecture = ui.prefectureFilter.value;
  const documentType = ui.documentTypeFilter.value;
  const subjectObject = ui.subjectObjectFilter.value;
  const relation = ui.relationFilter.value;
  const speakerClass = ui.speakerClassFilter.value;
  const speaker = ui.speakerFilter.value;
  state.filtered = state.all.filter((row) =>
    (!prefecture || row.values[7] === prefecture) &&
    (!documentType || row.values[8] === documentType) &&
    (!subjectObject || row.values[0] === subjectObject || row.values[2] === subjectObject) &&
    (!relation || row.values[1] === relation) &&
    (!speakerClass || row.values[3] === speakerClass) &&
    (!speaker || row.values[4] === speaker) &&
    terms.every((term) => row.values.some((value) => value.toLocaleLowerCase("ja").includes(term)))
  );
  state.page = 1;
  render();
}

function appendCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text || "—";
  row.append(cell);
}

function render() {
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const sorted = state.sortIndex === null ? state.filtered : [...state.filtered].sort((a, b) => {
    const result = collator.compare(a.values[state.sortIndex], b.values[state.sortIndex]);
    return (state.sortDirection === "asc" ? result : -result) || a.sourceIndex - b.sourceIndex;
  });
  const rows = sorted.slice(start, start + state.pageSize);
  const fragment = document.createDocumentFragment();

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    appendCell(tr, String(item.sourceIndex + 1));
    appendCell(tr, item.values[7]);
    appendCell(tr, item.values[8]);

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-button";
    button.textContent = "本文を表示";
    button.disabled = !item.values[6];
    button.addEventListener("click", () => showText(item));
    actionCell.append(button);
    tr.append(actionCell);
    item.values.slice(0, 6).forEach((value) => appendCell(tr, value));
    fragment.append(tr);
  });

  ui.body.replaceChildren(fragment);
  ui.empty.hidden = total !== 0;
  ui.status.textContent = `${total.toLocaleString("ja-JP")}件 / 全${state.all.length.toLocaleString("ja-JP")}件`;
  ui.pageInfo.textContent = total ? `${state.page} / ${pages} ページ（${start + 1}–${Math.min(start + state.pageSize, total)}件）` : "0件";
  ui.prev.disabled = state.page <= 1;
  ui.next.disabled = state.page >= pages;
  document.querySelectorAll(".sort-button").forEach((button) => {
    const active = Number(button.dataset.sort) === state.sortIndex;
    if (active) button.dataset.direction = state.sortDirection;
    else delete button.dataset.direction;
    button.closest("th").setAttribute("aria-sort", active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none");
  });
}

function showText(item) {
  ui.dialogPrefecture.textContent = item.values[7] || "—";
  ui.dialogDocumentType.textContent = item.values[8] || "—";
  ui.dialogDocLabel.textContent = item.values[9] || "—";
  ui.dialogText.textContent = item.values[6] || "本文はありません。";
  ui.dialogTriple.textContent = [item.values[0], item.values[1], item.values[2]].map((value) => value || "—").join(" − ");
  ui.dialogSpeakerClass.textContent = item.values[3] || "—";
  ui.dialogSpeaker.textContent = item.values[4] || "—";
  ui.dialogOpinion.textContent = item.values[5] || "—";
  ui.dialog.showModal();
}

async function loadDefault() {
  try {
    const response = await fetch("refv-ja-2.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setData(await response.json());
  } catch (error) {
    console.warn("JSONの自動読み込みに失敗しました。", error);
    ui.status.textContent = "JSON未読み込み";
    ui.help.hidden = false;
  }
}

let searchTimer;
ui.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilter, 180);
});
[ui.prefectureFilter, ui.documentTypeFilter, ui.subjectObjectFilter, ui.relationFilter, ui.speakerClassFilter, ui.speakerFilter]
  .forEach((select) => select.addEventListener("change", applyFilter));
ui.clearFilters.addEventListener("click", () => {
  [ui.prefectureFilter, ui.documentTypeFilter, ui.subjectObjectFilter, ui.relationFilter, ui.speakerClassFilter, ui.speakerFilter].forEach((select) => { select.value = ""; });
  applyFilter();
});
ui.pageSize.addEventListener("change", () => { state.pageSize = Number(ui.pageSize.value); state.page = 1; render(); });
ui.clear.addEventListener("click", () => { ui.search.value = ""; applyFilter(); ui.search.focus(); });
ui.prev.addEventListener("click", () => { state.page -= 1; render(); scrollTo({ top: 0, behavior: "smooth" }); });
ui.next.addEventListener("click", () => { state.page += 1; render(); scrollTo({ top: 0, behavior: "smooth" }); });
document.querySelectorAll(".sort-button").forEach((button) => button.addEventListener("click", () => {
  const sortIndex = Number(button.dataset.sort);
  if (state.sortIndex === sortIndex) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
  else { state.sortIndex = sortIndex; state.sortDirection = "asc"; }
  state.page = 1;
  render();
}));
ui.file.addEventListener("change", async () => {
  const file = ui.file.files[0];
  if (!file) return;
  try { setData(JSON.parse(await file.text())); }
  catch (error) { ui.status.textContent = "読み込みエラー"; alert(`JSONを読み込めませんでした。\n${error.message}`); }
});
document.querySelector("#closeDialog").addEventListener("click", () => ui.dialog.close());
document.querySelector("#closeDialogBottom").addEventListener("click", () => ui.dialog.close());
ui.dialog.addEventListener("click", (event) => {
  const rect = ui.dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.dialog.close();
});

loadDefault();
