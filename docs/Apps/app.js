"use strict";

const fields = ["sLabel", "pLabel", "oLabel", "stCategoryLabel", "stTypeLabel", "stClassLabel", "stLabel", "opText", "tText", "prefLabel", "docTypeLabel", "docLabel"];
const state = {
  all: [], filtered: [], page: 1, pageSize: 50, sortIndex: null, sortDirection: "asc",
  visibleColumns: new Set()
};
const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });
const settingsStorageKey = "refv-kg-view-settings";

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
  speakerCategoryFilter: document.querySelector("#speakerCategoryFilter"),
  speakerTypeFilter: document.querySelector("#speakerTypeFilter"),
  speakerClassFilter: document.querySelector("#speakerClassFilter"),
  speakerFilter: document.querySelector("#speakerFilter"),
  clearFilters: document.querySelector("#clearFiltersButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  dialog: document.querySelector("#textDialog"),
  dialogPrefecture: document.querySelector("#dialogPrefecture"),
  dialogDocumentType: document.querySelector("#dialogDocumentType"),
  dialogDocLabel: document.querySelector("#dialogDocLabel"),
  dialogText: document.querySelector("#dialogText"),
  dialogTriple: document.querySelector("#dialogTriple"),
  dialogSpeakerCategory: document.querySelector("#dialogSpeakerCategory"),
  dialogSpeakerType: document.querySelector("#dialogSpeakerType"),
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

function selectedValues(select) {
  return new Set([...select.selectedOptions].map((option) => option.value).filter(Boolean));
}

function matchesSelection(selected, value) {
  return selected.size === 0 || selected.has(value);
}

function clearSelect(select) {
  [...select.options].forEach((option) => { option.selected = option.value === ""; });
}

function syncMultiSelect(select) {
  const control = select._multiSelectControl;
  if (!control) return;
  const selected = selectedValues(select);
  if (selected.size === 0) control.button.textContent = "すべて";
  else if (selected.size === 1) control.button.textContent = [...selected][0];
  else control.button.textContent = `${selected.size}件選択`;

  const fragment = document.createDocumentFragment();
  [...select.options].filter((option) => option.value).forEach((option) => {
    const label = document.createElement("label");
    label.className = "multi-select-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = option.value;
    checkbox.checked = option.selected;
    checkbox.addEventListener("change", () => {
      option.selected = checkbox.checked;
      const hasSelection = selectedValues(select).size > 0;
      const allOption = [...select.options].find((item) => item.value === "");
      if (allOption) allOption.selected = !hasSelection;
      applyFilter();
    });
    const text = document.createElement("span");
    text.textContent = option.textContent;
    label.append(checkbox, text);
    fragment.append(label);
  });
  control.menu.replaceChildren(fragment);
}

function initMultiSelect(select) {
  const wrapper = document.createElement("div");
  wrapper.className = "multi-select-control";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "multi-select-toggle";
  button.hidden = true;
  button.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "multi-select-menu";
  menu.hidden = false;
  wrapper.append(button, menu);
  select.after(wrapper);
  select._multiSelectControl = { button, menu };

  syncMultiSelect(select);
}

function fillSelect(select, entries, total) {
  const selected = selectedValues(select);
  selected.forEach((value) => {
    if (!entries.some(([entryValue]) => entryValue === value)) entries.push([value, 0]);
  });
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
  [...select.options].forEach((option) => {
    option.selected = selected.size === 0 ? option.value === "" : selected.has(option.value);
  });
  syncMultiSelect(select);
}

function matchesListFilters(row, excluded = "") {
  const prefecture = selectedValues(ui.prefectureFilter);
  const documentType = selectedValues(ui.documentTypeFilter);
  const subjectObject = selectedValues(ui.subjectObjectFilter);
  const relation = selectedValues(ui.relationFilter);
  const speakerCategory = selectedValues(ui.speakerCategoryFilter);
  const speakerType = selectedValues(ui.speakerTypeFilter);
  const speakerClass = selectedValues(ui.speakerClassFilter);
  const speaker = selectedValues(ui.speakerFilter);
  return (
    (excluded === "prefecture" || matchesSelection(prefecture, row.values[9])) &&
    (excluded === "documentType" || matchesSelection(documentType, row.values[10])) &&
    (excluded === "subjectObject" || subjectObject.size === 0 || subjectObject.has(row.values[0]) || subjectObject.has(row.values[2])) &&
    (excluded === "relation" || matchesSelection(relation, row.values[1])) &&
    (excluded === "speakerCategory" || matchesSelection(speakerCategory, row.values[3])) &&
    (excluded === "speakerType" || matchesSelection(speakerType, row.values[4])) &&
    (excluded === "speakerClass" || matchesSelection(speakerClass, row.values[5])) &&
    (excluded === "speaker" || matchesSelection(speaker, row.values[6]))
  );
}

function buildFilterOptions() {
  const prefectureRows = state.all.filter((row) => matchesListFilters(row, "prefecture"));
  const documentTypeRows = state.all.filter((row) => matchesListFilters(row, "documentType"));
  const subjectObjectRows = state.all.filter((row) => matchesListFilters(row, "subjectObject"));
  const relationRows = state.all.filter((row) => matchesListFilters(row, "relation"));
  const speakerCategoryRows = state.all.filter((row) => matchesListFilters(row, "speakerCategory"));
  const speakerTypeRows = state.all.filter((row) => matchesListFilters(row, "speakerType"));
  const speakerClassRows = state.all.filter((row) => matchesListFilters(row, "speakerClass"));
  const speakerRows = state.all.filter((row) => matchesListFilters(row, "speaker"));
  fillSelect(ui.prefectureFilter, countValues(prefectureRows.map((row) => [row.values[9]])), prefectureRows.length);
  fillSelect(ui.documentTypeFilter, countValues(documentTypeRows.map((row) => [row.values[10]])), documentTypeRows.length);
  fillSelect(ui.subjectObjectFilter, countValues(subjectObjectRows.map((row) => [row.values[0], row.values[2]])), subjectObjectRows.length);
  fillSelect(ui.relationFilter, countValues(relationRows.map((row) => [row.values[1]])), relationRows.length);
  fillSelect(ui.speakerCategoryFilter, countValues(speakerCategoryRows.map((row) => [row.values[3]])), speakerCategoryRows.length);
  fillSelect(ui.speakerTypeFilter, countValues(speakerTypeRows.map((row) => [row.values[4]])), speakerTypeRows.length);
  fillSelect(ui.speakerClassFilter, countValues(speakerClassRows.map((row) => [row.values[5]])), speakerClassRows.length);
  fillSelect(ui.speakerFilter, countValues(speakerRows.map((row) => [row.values[6]])), speakerRows.length);
}

function applyFilter() {
  buildFilterOptions();
  const terms = ui.search.value.trim().toLocaleLowerCase("ja").split(/\s+/).filter(Boolean);
  const prefecture = selectedValues(ui.prefectureFilter);
  const documentType = selectedValues(ui.documentTypeFilter);
  const subjectObject = selectedValues(ui.subjectObjectFilter);
  const relation = selectedValues(ui.relationFilter);
  const speakerCategory = selectedValues(ui.speakerCategoryFilter);
  const speakerType = selectedValues(ui.speakerTypeFilter);
  const speakerClass = selectedValues(ui.speakerClassFilter);
  const speaker = selectedValues(ui.speakerFilter);
  state.filtered = state.all.filter((row) =>
    matchesSelection(prefecture, row.values[9]) &&
    matchesSelection(documentType, row.values[10]) &&
    (subjectObject.size === 0 || subjectObject.has(row.values[0]) || subjectObject.has(row.values[2])) &&
    matchesSelection(relation, row.values[1]) &&
    matchesSelection(speakerCategory, row.values[3]) &&
    matchesSelection(speakerType, row.values[4]) &&
    matchesSelection(speakerClass, row.values[5]) &&
    matchesSelection(speaker, row.values[6]) &&
    terms.every((term) => row.values.some((value) => value.toLocaleLowerCase("ja").includes(term)))
  );
  state.page = 1;
  render();
}

function appendCell(row, text, column = "") {
  const cell = document.createElement("td");
  if (column) {
    cell.dataset.column = column;
    cell.hidden = !state.visibleColumns.has(column);
  }
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
    appendCell(tr, item.values[9], "prefecture");
    appendCell(tr, item.values[10], "documentType");

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-button";
    button.textContent = "本文を表示";
    button.disabled = !item.values[8];
    button.addEventListener("click", () => showText(item));
    actionCell.append(button);
    actionCell.dataset.column = "text";
    actionCell.hidden = !state.visibleColumns.has("text");
    tr.append(actionCell);
    const valueColumns = ["subject", "relation", "object", "speakerCategory", "speakerType", "speakerClass", "speaker", "opinion"];
    item.values.slice(0, 8).forEach((value, index) => appendCell(tr, value, valueColumns[index]));
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

function saveSettings() {
  const settings = {
    filters: [...document.querySelectorAll("[data-setting-filter]")].filter((input) => input.checked).map((input) => input.dataset.settingFilter),
    columns: [...state.visibleColumns]
  };
  try { localStorage.setItem(settingsStorageKey, JSON.stringify(settings)); }
  catch (error) { console.warn("表示設定を保存できませんでした。", error); }
}

function applySettings({ updateData = true, save = true } = {}) {
  document.querySelectorAll("[data-setting-filter]").forEach((input) => {
    const filter = input.dataset.settingFilter;
    const container = document.querySelector(`[data-filter="${filter}"]`);
    container.hidden = !input.checked;
    if (!input.checked) clearSelect(container.querySelector("select"));
  });

  state.visibleColumns = new Set(
    [...document.querySelectorAll("[data-setting-column]")]
      .filter((input) => input.checked)
      .map((input) => input.dataset.settingColumn)
  );
  document.querySelectorAll("th[data-column]").forEach((cell) => {
    cell.hidden = !state.visibleColumns.has(cell.dataset.column);
  });
  if (save) saveSettings();
  if (updateData) applyFilter();
  else render();
}

function loadSettings() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(settingsStorageKey)); }
  catch (error) { console.warn("保存された表示設定を読み込めませんでした。", error); }
  document.querySelectorAll("[data-setting-filter]").forEach((input) => {
    input.checked = !Array.isArray(saved?.filters) || saved.filters.includes(input.dataset.settingFilter);
  });
  document.querySelectorAll("[data-setting-column]").forEach((input) => {
    input.checked = !Array.isArray(saved?.columns) || saved.columns.includes(input.dataset.settingColumn);
  });
  applySettings({ updateData: false, save: false });
}

function showText(item) {
  ui.dialogPrefecture.textContent = item.values[9] || "—";
  ui.dialogDocumentType.textContent = item.values[10] || "—";
  ui.dialogDocLabel.textContent = item.values[11] || "—";
  ui.dialogText.textContent = item.values[8] || "本文はありません。";
  ui.dialogTriple.textContent = [item.values[0], item.values[1], item.values[2]].map((value) => value || "—").join(" − ");
  ui.dialogSpeakerCategory.textContent = item.values[3] || "—";
  ui.dialogSpeakerType.textContent = item.values[4] || "—";
  ui.dialogSpeakerClass.textContent = item.values[5] || "—";
  ui.dialogSpeaker.textContent = item.values[6] || "—";
  ui.dialogOpinion.textContent = item.values[7] || "—";
  ui.dialog.showModal();
}

async function loadDefault() {
  try {
    const response = await fetch("refv-ja-3.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setData(await response.json());
  } catch (error) {
    console.warn("JSONの自動読み込みに失敗しました。", error);
    ui.status.textContent = "JSON未読み込み";
    ui.help.hidden = false;
  }
}

let searchTimer;
const filterSelects = [ui.prefectureFilter, ui.documentTypeFilter, ui.subjectObjectFilter, ui.relationFilter, ui.speakerCategoryFilter, ui.speakerTypeFilter, ui.speakerClassFilter, ui.speakerFilter];
filterSelects.forEach(initMultiSelect);
ui.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilter, 180);
});
filterSelects.forEach((select) => select.addEventListener("change", applyFilter));
ui.clearFilters.addEventListener("click", () => {
  filterSelects.forEach(clearSelect);
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

ui.settingsButton.addEventListener("click", () => ui.settingsDialog.showModal());
document.querySelector("#closeSettings").addEventListener("click", () => ui.settingsDialog.close());
document.querySelector("#closeSettingsBottom").addEventListener("click", () => ui.settingsDialog.close());
document.querySelectorAll("[data-setting-filter], [data-setting-column]").forEach((input) => {
  input.addEventListener("change", () => applySettings());
});
document.querySelector("#resetSettings").addEventListener("click", () => {
  document.querySelectorAll("[data-setting-filter], [data-setting-column]").forEach((input) => { input.checked = true; });
  applySettings();
});
ui.settingsDialog.addEventListener("click", (event) => {
  const rect = ui.settingsDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.settingsDialog.close();
});

loadSettings();
loadDefault();
