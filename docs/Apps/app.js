"use strict";

const labelMode = new URLSearchParams(location.search).get("labels") === "class" ? "class" : "instance";
const subjectLabelField = labelMode === "class" ? "scLabel" : "sLabel";
const objectLabelField = labelMode === "class" ? "ocLabel" : "oLabel";
const fields = [subjectLabelField, "pLabel", objectLabelField, "stCategoryLabel", "stTypeLabel", "stClassLabel", "stLabel", "opText", "tText", "prefLabel", "docTypeLabel", "docLabel", "sLabel", "oLabel", "scLabel", "ocLabel"];
const state = {
  all: [], filtered: [], page: 1, pageSize: 50, sortIndex: null, sortDirection: "asc",
  visibleColumns: new Set(), highlightSelections: {}, annotationTrie: null, searchLabels: new Map(),
  showInstanceLabels: false
};
const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });
const settingsStorageKey = "refv-kg-view-settings";
const emptySelection = new Set();
const defaultVisibleFilters = new Set(["subjectObject", "relation", "subjectObject2", "speakerType", "speaker"]);
const defaultVisibleColumns = new Set(["documentType", "text", "subject", "relation", "object", "speakerType", "speaker", "opinion"]);

const ui = {
  status: document.querySelector("#status"),
  labelModeBadge: document.querySelector("#labelModeBadge"),
  labelModeSwitch: document.querySelector("#labelModeSwitch"),
  showInstanceLabelsSetting: document.querySelector("#showInstanceLabelsSetting"),
  annotationInput: document.querySelector("#annotationInput"),
  annotationOutput: document.querySelector("#annotationOutput"),
  textModeButton: document.querySelector("#textModeButton"),
  keywordModeButton: document.querySelector("#keywordModeButton"),
  textSearchPanel: document.querySelector("#textSearchPanel"),
  keywordSearchPanel: document.querySelector("#keywordSearchPanel"),
  keywordInput: document.querySelector("#keywordInput"),
  keywordResults: document.querySelector("#keywordResults"),
  keywordResultCount: document.querySelector("#keywordResultCount"),
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
  subjectObjectFilter2: document.querySelector("#subjectObjectFilter2"),
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
  dialogTripleInstance: document.querySelector("#dialogTripleInstance"),
  dialogTripleClass: document.querySelector("#dialogTripleClass"),
  dialogSpeakerCategory: document.querySelector("#dialogSpeakerCategory"),
  dialogSpeakerType: document.querySelector("#dialogSpeakerType"),
  dialogSpeakerClass: document.querySelector("#dialogSpeakerClass"),
  dialogSpeaker: document.querySelector("#dialogSpeaker"),
  dialogOpinion: document.querySelector("#dialogOpinion")
};

const valueOf = (binding, key) => binding?.[key]?.value ?? "";

function initializeLabelMode() {
  if (labelMode === "class") {
    ui.labelModeBadge.textContent = "クラスラベル版（scLabel / ocLabel）";
    ui.labelModeSwitch.textContent = "個別ラベル版へ";
    ui.labelModeSwitch.href = location.pathname;
    document.title = "REFV-KG データビューア［クラスラベル版］";
  } else {
    ui.labelModeBadge.textContent = "個別ラベル版（sLabel / oLabel）";
    ui.labelModeSwitch.textContent = "クラスラベル版へ";
    ui.labelModeSwitch.href = `${location.pathname}?labels=class`;
  }
  ui.showInstanceLabelsSetting.hidden = labelMode !== "class";
}

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
  state.searchLabels = buildSearchLabels(state.all);
  state.annotationTrie = buildAnnotationTrie(state.searchLabels);
  state.page = 1;
  ui.help.hidden = true;
  buildFilterOptions();
  applyFilter();
  renderAnnotations();
  renderKeywordResults();
}

function buildSearchLabels(rows) {
  const labels = new Map();
  const addLabel = (value, type) => {
    if (!value) return;
    if (!labels.has(value)) labels.set(value, new Set());
    labels.get(value).add(type);
  };
  rows.forEach((row) => {
    addLabel(row.values[0], "subjectObject");
    addLabel(row.values[2], "subjectObject");
    addLabel(row.values[6], "speaker");
  });
  return labels;
}

function buildAnnotationTrie(labels) {
  const root = new Map();
  labels.forEach((types, label) => {
    let node = root;
    for (const character of label) {
      if (!node.has(character)) node.set(character, new Map());
      node = node.get(character);
    }
    node.annotationValue = label;
    node.annotationTypes = [...types];
  });
  return root;
}

function setFilterOption(select, value, selected) {
  let option = [...select.options].find((item) => item.value === value);
  if (!option) {
    option = document.createElement("option");
    option.value = value;
    option.textContent = `${value}（0件）`;
    select.append(option);
  }
  option.selected = selected;
  const allOption = [...select.options].find((item) => item.value === "");
  if (allOption) allOption.selected = selectedValues(select).size === 0;
}

function toggleAnnotationFilterValue(value, types) {
  const targets = types.map((type) => type === "speaker" ? ui.speakerFilter : ui.subjectObjectFilter);
  const shouldSelect = !targets.every((select) => selectedValues(select).has(value));
  targets.forEach((select) => setFilterOption(select, value, shouldSelect));
  applyFilter();
  renderAnnotations();
}

function renderAnnotations() {
  const text = ui.annotationInput.value;
  if (!text) {
    ui.annotationOutput.textContent = "テキストを入力すると、該当する単語を色付きで表示します。";
    return;
  }
  const fragment = document.createDocumentFragment();
  let plainText = "";
  const flushPlainText = () => {
    if (!plainText) return;
    fragment.append(document.createTextNode(plainText));
    plainText = "";
  };

  for (let index = 0; index < text.length;) {
    let node = state.annotationTrie;
    let bestEnd = -1;
    let bestValue = "";
    let bestTypes = [];
    for (let cursor = index; node && cursor < text.length; cursor += 1) {
      node = node.get(text[cursor]);
      if (node?.annotationValue) {
        bestEnd = cursor + 1;
        bestValue = node.annotationValue;
        bestTypes = node.annotationTypes;
      }
    }
    if (bestEnd > index) {
      flushPlainText();
      const button = document.createElement("button");
      button.type = "button";
      button.className = "annotation-token";
      bestTypes.forEach((type) => button.classList.add(`annotation-token-${type}`));
      button.dataset.annotationValue = bestValue;
      button.dataset.annotationTypes = bestTypes.join(",");
      button.textContent = text.slice(index, bestEnd);
      button.title = "対応する絞り込み条件を選択・解除";
      button.addEventListener("click", () => toggleAnnotationFilterValue(bestValue, bestTypes));
      fragment.append(button);
      index = bestEnd;
    } else {
      plainText += text[index];
      index += 1;
    }
  }
  flushPlainText();
  ui.annotationOutput.replaceChildren(fragment);
  updateAnnotationSelection();
}

function renderKeywordResults() {
  const query = ui.keywordInput.value.trim().toLocaleLowerCase("ja");
  ui.keywordResultCount.textContent = "";
  if (!query) {
    ui.keywordResults.textContent = "キーワードを入力すると候補を表示します。";
    return;
  }
  const matches = [...state.searchLabels.entries()]
    .filter(([value]) => value.toLocaleLowerCase("ja").includes(query))
    .sort((a, b) => {
      const aStarts = a[0].toLocaleLowerCase("ja").startsWith(query);
      const bStarts = b[0].toLocaleLowerCase("ja").startsWith(query);
      return Number(bStarts) - Number(aStarts) || a[0].length - b[0].length || collator.compare(a[0], b[0]);
    });
  const limit = 200;
  const fragment = document.createDocumentFragment();
  matches.slice(0, limit).forEach(([value, typeSet]) => {
    const types = [...typeSet];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keyword-result-item";
    types.forEach((type) => button.classList.add(`keyword-result-${type}`));
    button.dataset.annotationValue = value;
    button.dataset.annotationTypes = types.join(",");
    const valueElement = document.createElement("span");
    valueElement.className = "keyword-result-value";
    valueElement.textContent = value;
    const typeElement = document.createElement("span");
    typeElement.className = "keyword-result-types";
    typeElement.textContent = types.map((type) => type === "speaker" ? "発言者" : "主語・目的語").join("・");
    button.append(valueElement, typeElement);
    button.addEventListener("click", () => toggleAnnotationFilterValue(value, types));
    fragment.append(button);
  });
  if (matches.length === 0) {
    ui.keywordResults.textContent = "一致する候補がありません。";
  } else {
    ui.keywordResults.replaceChildren(fragment);
  }
  ui.keywordResultCount.textContent = matches.length > limit
    ? `（${matches.length.toLocaleString("ja-JP")}件中${limit}件を表示）`
    : `（${matches.length.toLocaleString("ja-JP")}件）`;
  updateAnnotationSelection();
}

function updateAnnotationSelection() {
  document.querySelectorAll("#annotationOutput [data-annotation-value], #keywordResults [data-annotation-value]").forEach((token) => {
    const types = token.dataset.annotationTypes.split(",");
    const isSelected = types.every((type) => {
      const select = type === "speaker" ? ui.speakerFilter : ui.subjectObjectFilter;
      return selectedValues(select).has(token.dataset.annotationValue);
    });
    token.classList.toggle("is-selected", isSelected);
  });
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

function matchesTripleEntities(row, first, second) {
  const subject = row.values[0];
  const object = row.values[2];
  if (first.size === 0 && second.size === 0) return true;
  if (first.size === 0) return second.has(subject) || second.has(object);
  if (second.size === 0) return first.has(subject) || first.has(object);
  return (first.has(subject) && second.has(object)) || (first.has(object) && second.has(subject));
}

function clearSelect(select) {
  [...select.options].forEach((option) => { option.selected = option.value === ""; });
}

function closeMultiSelect(select) {
  const control = select._multiSelectControl;
  if (!control) return;
  control.menu.hidden = true;
  control.button.setAttribute("aria-expanded", "false");
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
    const filterKey = select.closest("[data-filter]").dataset.filter;
    label.classList.add(`filter-choice-${filterKey}`);
    if (option.selected) label.classList.add("is-selected");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = option.value;
    checkbox.checked = option.selected;
    checkbox.addEventListener("change", () => {
      option.selected = checkbox.checked;
      label.classList.toggle("is-selected", checkbox.checked);
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
  button.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "multi-select-menu";
  menu.hidden = true;
  wrapper.append(button, menu);
  select.after(wrapper);
  select._multiSelectControl = { button, menu };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    filterSelects.forEach((other) => {
      if (other !== select) closeMultiSelect(other);
    });
    menu.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
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
  const subjectObject2 = selectedValues(ui.subjectObjectFilter2);
  const relation = selectedValues(ui.relationFilter);
  const speakerCategory = selectedValues(ui.speakerCategoryFilter);
  const speakerType = selectedValues(ui.speakerTypeFilter);
  const speakerClass = selectedValues(ui.speakerClassFilter);
  const speaker = selectedValues(ui.speakerFilter);
  return (
    (excluded === "prefecture" || matchesSelection(prefecture, row.values[9])) &&
    (excluded === "documentType" || matchesSelection(documentType, row.values[10])) &&
    matchesTripleEntities(
      row,
      excluded === "subjectObject" ? emptySelection : subjectObject,
      excluded === "subjectObject2" ? emptySelection : subjectObject2
    ) &&
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
  const subjectObjectRows2 = state.all.filter((row) => matchesListFilters(row, "subjectObject2"));
  const relationRows = state.all.filter((row) => matchesListFilters(row, "relation"));
  const speakerCategoryRows = state.all.filter((row) => matchesListFilters(row, "speakerCategory"));
  const speakerTypeRows = state.all.filter((row) => matchesListFilters(row, "speakerType"));
  const speakerClassRows = state.all.filter((row) => matchesListFilters(row, "speakerClass"));
  const speakerRows = state.all.filter((row) => matchesListFilters(row, "speaker"));
  fillSelect(ui.prefectureFilter, countValues(prefectureRows.map((row) => [row.values[9]])), prefectureRows.length);
  fillSelect(ui.documentTypeFilter, countValues(documentTypeRows.map((row) => [row.values[10]])), documentTypeRows.length);
  fillSelect(ui.subjectObjectFilter, countValues(subjectObjectRows.map((row) => [row.values[0], row.values[2]])), subjectObjectRows.length);
  fillSelect(ui.subjectObjectFilter2, countValues(subjectObjectRows2.map((row) => [row.values[0], row.values[2]])), subjectObjectRows2.length);
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
  const subjectObject2 = selectedValues(ui.subjectObjectFilter2);
  const relation = selectedValues(ui.relationFilter);
  const speakerCategory = selectedValues(ui.speakerCategoryFilter);
  const speakerType = selectedValues(ui.speakerTypeFilter);
  const speakerClass = selectedValues(ui.speakerClassFilter);
  const speaker = selectedValues(ui.speakerFilter);
  state.filtered = state.all.filter((row) =>
    matchesSelection(prefecture, row.values[9]) &&
    matchesSelection(documentType, row.values[10]) &&
    matchesTripleEntities(row, subjectObject, subjectObject2) &&
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

function selectedFilterTypes(column, value) {
  if (!value) return [];
  if (column === "subject" || column === "object") {
    const types = [];
    if (state.highlightSelections.subjectObject?.has(value)) types.push("subjectObject");
    if (state.highlightSelections.subjectObject2?.has(value)) types.push("subjectObject2");
    return types;
  }
  const filterByColumn = {
    prefecture: "prefecture",
    documentType: "documentType",
    relation: "relation",
    speakerCategory: "speakerCategory",
    speakerType: "speakerType",
    speakerClass: "speakerClass",
    speaker: "speaker"
  };
  const filterType = filterByColumn[column];
  return filterType && state.highlightSelections[filterType]?.has(value) ? [filterType] : [];
}

function appendCell(row, text, column = "", secondaryText = "") {
  const cell = document.createElement("td");
  if (column) {
    cell.dataset.column = column;
    cell.hidden = !state.visibleColumns.has(column);
  }
  const selectedTypes = selectedFilterTypes(column, text);
  if (selectedTypes.length) {
    cell.classList.add("filter-match");
    selectedTypes.forEach((type) => cell.classList.add(`filter-match-${type}`));
    cell.title = "絞り込み条件で選択中";
  }
  if (["subject", "relation", "object"].includes(column)) {
    cell.classList.add("triple-cell");
    if (column === "relation") {
      const line = document.createElement("span");
      line.className = "triple-connector";
      line.textContent = "－";
      line.setAttribute("aria-hidden", "true");
      cell.append(line);
    }
    const tag = document.createElement("span");
    tag.className = `triple-tag triple-tag-${column}`;
    tag.textContent = text || "—";
    cell.append(tag);
    if (column === "relation") {
      const arrow = document.createElement("span");
      arrow.className = "triple-arrow";
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      cell.append(arrow);
    }
    if (secondaryText && (column === "subject" || column === "object")) {
      const secondary = document.createElement("div");
      secondary.className = "instance-label-note";
      const label = document.createElement("span");
      label.textContent = "個別ラベル";
      secondary.append(label, document.createTextNode(secondaryText));
      cell.append(secondary);
    }
  } else if (column === "speakerType") {
    const tag = document.createElement("span");
    tag.className = "stakeholder-type-tag";
    tag.textContent = text || "—";
    cell.append(tag);
  } else {
    cell.textContent = text || "—";
  }
  row.append(cell);
}

function renderTriple(container, subject, relation, object) {
  const parts = [
    ["subject", subject],
    ["relation", relation],
    ["object", object]
  ];
  const fragment = document.createDocumentFragment();
  parts.forEach(([type, value]) => {
    if (type === "relation") {
      const line = document.createElement("span");
      line.className = "triple-connector";
      line.textContent = "－";
      line.setAttribute("aria-hidden", "true");
      fragment.append(line);
    }
    const tag = document.createElement("span");
    tag.className = `triple-tag triple-tag-${type}`;
    tag.textContent = value || "—";
    fragment.append(tag);
    if (type === "relation") {
      const arrow = document.createElement("span");
      arrow.className = "triple-arrow";
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      fragment.append(arrow);
    }
  });
  container.replaceChildren(fragment);
}

function render() {
  state.highlightSelections = {
    subjectObject: selectedValues(ui.subjectObjectFilter),
    subjectObject2: selectedValues(ui.subjectObjectFilter2),
    prefecture: selectedValues(ui.prefectureFilter),
    documentType: selectedValues(ui.documentTypeFilter),
    relation: selectedValues(ui.relationFilter),
    speakerCategory: selectedValues(ui.speakerCategoryFilter),
    speakerType: selectedValues(ui.speakerTypeFilter),
    speakerClass: selectedValues(ui.speakerClassFilter),
    speaker: selectedValues(ui.speakerFilter)
  };
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
    item.values.slice(0, 8).forEach((value, index) => {
      const column = valueColumns[index];
      const secondaryText = state.showInstanceLabels && column === "subject"
        ? item.values[12]
        : state.showInstanceLabels && column === "object" ? item.values[13] : "";
      appendCell(tr, value, column, secondaryText);
    });
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
  updateAnnotationSelection();
}

function saveSettings() {
  const settings = {
    version: 5,
    filters: [...document.querySelectorAll("[data-setting-filter]")].filter((input) => input.checked).map((input) => input.dataset.settingFilter),
    columns: [...state.visibleColumns],
    showInstanceLabels: document.querySelector('[data-setting-option="showInstanceLabels"]').checked
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
  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    group.hidden = ![...group.querySelectorAll("[data-filter]")].some((field) => !field.hidden);
  });

  state.visibleColumns = new Set(
    [...document.querySelectorAll("[data-setting-column]")]
      .filter((input) => input.checked)
      .map((input) => input.dataset.settingColumn)
  );
  state.showInstanceLabels = labelMode === "class"
    && document.querySelector('[data-setting-option="showInstanceLabels"]').checked;
  document.querySelectorAll("th[data-column]").forEach((cell) => {
    cell.hidden = !state.visibleColumns.has(cell.dataset.column);
  });
  document.querySelectorAll("th[data-column-group]").forEach((heading) => {
    const visibleCount = [...document.querySelectorAll(`th[data-group="${heading.dataset.columnGroup}"]`)]
      .filter((cell) => state.visibleColumns.has(cell.dataset.column)).length;
    heading.hidden = visibleCount === 0;
    heading.colSpan = Math.max(1, visibleCount);
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
    input.checked = [4, 5].includes(saved?.version) && Array.isArray(saved?.filters)
      ? saved.filters.includes(input.dataset.settingFilter)
      : defaultVisibleFilters.has(input.dataset.settingFilter);
  });
  document.querySelectorAll("[data-setting-column]").forEach((input) => {
    input.checked = [4, 5].includes(saved?.version) && Array.isArray(saved?.columns)
      ? saved.columns.includes(input.dataset.settingColumn)
      : defaultVisibleColumns.has(input.dataset.settingColumn);
  });
  document.querySelector('[data-setting-option="showInstanceLabels"]').checked = saved?.version === 5 && saved.showInstanceLabels === true;
  applySettings({ updateData: false, save: false });
}

function showText(item) {
  ui.dialogPrefecture.textContent = item.values[9] || "—";
  ui.dialogDocumentType.textContent = item.values[10] || "—";
  ui.dialogDocLabel.textContent = item.values[11] || "—";
  ui.dialogText.textContent = item.values[8] || "本文はありません。";
  renderTriple(ui.dialogTripleInstance, item.values[12], item.values[1], item.values[13]);
  renderTriple(ui.dialogTripleClass, item.values[14], item.values[1], item.values[15]);
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
let annotationTimer;
let keywordTimer;
const filterSelects = [ui.prefectureFilter, ui.documentTypeFilter, ui.subjectObjectFilter, ui.relationFilter, ui.subjectObjectFilter2, ui.speakerCategoryFilter, ui.speakerTypeFilter, ui.speakerClassFilter, ui.speakerFilter];
filterSelects.forEach(initMultiSelect);
document.addEventListener("click", () => filterSelects.forEach(closeMultiSelect));
ui.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilter, 180);
});
filterSelects.forEach((select) => select.addEventListener("change", applyFilter));
ui.clearFilters.addEventListener("click", () => {
  filterSelects.forEach(clearSelect);
  applyFilter();
});
ui.annotationInput.addEventListener("input", () => {
  clearTimeout(annotationTimer);
  annotationTimer = setTimeout(renderAnnotations, 140);
});
ui.keywordInput.addEventListener("input", () => {
  clearTimeout(keywordTimer);
  keywordTimer = setTimeout(renderKeywordResults, 140);
});
function setSearchMode(mode) {
  const isTextMode = mode === "text";
  ui.textSearchPanel.hidden = !isTextMode;
  ui.keywordSearchPanel.hidden = isTextMode;
  ui.textModeButton.classList.toggle("is-active", isTextMode);
  ui.keywordModeButton.classList.toggle("is-active", !isTextMode);
  ui.textModeButton.setAttribute("aria-selected", String(isTextMode));
  ui.keywordModeButton.setAttribute("aria-selected", String(!isTextMode));
  (isTextMode ? ui.annotationInput : ui.keywordInput).focus();
}
ui.textModeButton.addEventListener("click", () => setSearchMode("text"));
ui.keywordModeButton.addEventListener("click", () => setSearchMode("keyword"));
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
document.querySelectorAll("[data-setting-filter], [data-setting-column], [data-setting-option]").forEach((input) => {
  input.addEventListener("change", () => applySettings());
});
document.querySelector("#resetSettings").addEventListener("click", () => {
  document.querySelectorAll("[data-setting-filter]").forEach((input) => {
    input.checked = defaultVisibleFilters.has(input.dataset.settingFilter);
  });
  document.querySelectorAll("[data-setting-column]").forEach((input) => {
    input.checked = defaultVisibleColumns.has(input.dataset.settingColumn);
  });
  document.querySelector('[data-setting-option="showInstanceLabels"]').checked = false;
  applySettings();
});
ui.settingsDialog.addEventListener("click", (event) => {
  const rect = ui.settingsDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.settingsDialog.close();
});

initializeLabelMode();
loadSettings();
loadDefault();
