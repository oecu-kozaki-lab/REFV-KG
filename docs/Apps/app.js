"use strict";

const urlParameters = new URLSearchParams(location.search);
const languageMode = urlParameters.get("lang") === "en" ? "en" : "ja";
const displayLocale = languageMode === "en" ? "en-US" : "ja-JP";
const labelMode = urlParameters.get("labels") === "instance" ? "instance" : "class";
const subjectLabelField = labelMode === "class" ? "scLabel" : "sLabel";
const objectLabelField = labelMode === "class" ? "ocLabel" : "oLabel";
const fields = [subjectLabelField, "pLabel", objectLabelField, "stCategoryLabel", "stTypeLabel", "stClassLabel", "stLabel", "opText", "tText", "prefLabel", "docTypeLabel", "docLabel", "sLabel", "oLabel", "scLabel", "ocLabel"];
const state = {
  all: [], filtered: [], page: 1, pageSize: 50, sortIndex: null, sortDirection: "asc",
  visibleColumns: new Set(), highlightSelections: {}, annotationTrie: null, searchLabels: new Map(),
  searchLabelCounts: new Map(), searchTerms: [],
  showInstanceLabels: false
};
const collator = new Intl.Collator(languageMode, { numeric: true, sensitivity: "base" });
const settingsStorageKey = "refv-kg-view-settings";
const emptySelection = new Set();
const defaultVisibleFilters = new Set(["subjectObject", "relation", "subjectObject2", "speakerType", "speaker"]);
const defaultVisibleColumns = new Set(["documentType", "text", "subject", "relation", "object", "speakerType", "speaker", "opinion"]);
const annotationExamples = languageMode === "en" ? [
  "Because many schools, similar facilities, and residences are located in and around the assumed project area, consider avoiding or reducing project impacts by appropriately maintaining distances from wind turbines and these facilities. When implementing the plan, carefully consider the layout and other details to avoid or reduce impacts of operational noise and infrasound on surrounding facilities and residences as much as possible. Meanwhile, because cumulative impacts from noise and infrasound are a concern, appropriately predict and assess environmental impacts while taking surrounding wind power facilities into account.",
  "The construction of large-scale solar power plants, or mega-solar facilities, around Kushiro Wetland, home to rare species, has drawn national attention to whether renewable energy expansion and nature conservation can coexist. Since the 2011 Fukushima Daiichi nuclear accident, Japan has pursued renewable energy development through both the public and private sectors.",
  "Local residents and others have expressed concerns about impacts on the natural environment and landscape, as well as health damage from low-frequency noise and turbine shadows."
] : [
  "事業実施想定区域周辺の既設及び建設中の風力発電所並びに火力発電所との複合的又は累積的な環境影響を勘案し、これら他事業の諸元等の情報入手に努めながら、適切に調査、予測及び評価すること。",
  "釧路湿原周辺では、太陽光パネルの設置が相次ぐ。希少な野生生物への影響が危惧される。",
  "地域住民等から、景観や生態系への影響、騒音による健康被害を懸念する意見などが認められている。"
];

const ui = {
  status: document.querySelector("#status"),
  labelModeBadge: document.querySelector("#labelModeBadge"),
  labelModeSwitch: document.querySelector("#labelModeSwitch"),
  languageSwitch: document.querySelector("#languageSwitch"),
  dataFileName: document.querySelector("#dataFileName"),
  showInstanceLabelsSetting: document.querySelector("#showInstanceLabelsSetting"),
  annotationInput: document.querySelector("#annotationInput"),
  annotationOutput: document.querySelector("#annotationOutput"),
  annotationToggle: document.querySelector("#annotationToggle"),
  annotationBody: document.querySelector("#annotationBody"),
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
  graphViewButton: document.querySelector("#graphViewButton"),
  graphDialog: document.querySelector("#graphDialog"),
  graphDialogCount: document.querySelector("#graphDialogCount"),
  graphCanvasWrap: document.querySelector("#graphCanvasWrap"),
  graphCanvas: document.querySelector("#graphCanvas"),
  graphNodeDetail: document.querySelector("#graphNodeDetail"),
  resetGraphView: document.querySelector("#resetGraphView"),
  graphEmptyState: document.querySelector("#graphEmptyState"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  dialog: document.querySelector("#textDialog"),
  dialogPrefecture: document.querySelector("#dialogPrefecture"),
  dialogDocumentType: document.querySelector("#dialogDocumentType"),
  dialogDocLabel: document.querySelector("#dialogDocLabel"),
  dialogText: document.querySelector("#dialogText"),
  dialogTripleLabel: document.querySelector("#dialogTripleLabel"),
  dialogTriple: document.querySelector("#dialogTriple"),
  dialogSpeakerCategory: document.querySelector("#dialogSpeakerCategory"),
  dialogSpeakerType: document.querySelector("#dialogSpeakerType"),
  dialogSpeakerClass: document.querySelector("#dialogSpeakerClass"),
  dialogSpeaker: document.querySelector("#dialogSpeaker"),
  dialogOpinion: document.querySelector("#dialogOpinion")
};

const valueOf = (binding, key) => binding?.[key]?.value ?? "";
const formattedNumber = (value) => value.toLocaleString(displayLocale);
const countText = (value) => languageMode === "en" ? `${formattedNumber(value)} records` : `${formattedNumber(value)}件`;

function setDirectText(selector, text) {
  const element = document.querySelector(selector);
  if (!element) return;
  const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.textContent = text;
  else element.append(document.createTextNode(text));
}

function translateEnglishInterface() {
  if (languageMode !== "en") return;
  document.title = "Renewable Energy Future Vision Knowledge Graph";
  document.querySelector(".app-title-ja").hidden = true;
  const textBySelector = {
    "#settingsButton": "Display settings",
    ".header-file-button": "Select JSON",
    "#annotationTitle": "Text & Keyword Search",
    ".annotation-heading p": "Set search criteria by annotating text or using partial keyword matches.",
    "#annotationToggle": "Open",
    "#textModeButton": "Find causal structure (triples) from text",
    "#keywordModeButton": "Search by keyword",
    ".annotation-examples > span": "Examples:",
    "[data-example-index=\"0\"]": "Wind power",
    "[data-example-index=\"1\"]": "Solar power",
    "[data-example-index=\"2\"]": "Health impacts",
    "#textSearchPanel .annotation-input-label": "Text input",
    "#textSearchPanel .annotation-result-label": "Annotation results",
    "#keywordSearchPanel .annotation-input-label": "Keyword",
    "#keywordSearchPanel .annotation-result-label": "Search candidates ",
    ".filter-heading h2": "Search Causal Structures (Triples) + Stakeholders",
    ".filter-heading p": "Search “Subject or Object (1) — Relation — Subject or Object (2)” as one triple. Header colors correspond to table column groups.",
    "#clearFiltersButton": "Clear",
    "#graphViewButton": "Graph View",
    "[data-filter-group=\"triple\"] h3": "Causal Structure (Triple)",
    "[data-filter-group=\"stakeholder\"] h3": "Stakeholders",
    "[data-filter-group=\"other\"] h3": "Other",
    "[data-filter=\"subjectObject\"] > span": "Subject or Object (1)",
    "[data-filter=\"relation\"] > span": "Relation",
    "[data-filter=\"subjectObject2\"] > span": "Subject or Object (2)",
    "[data-filter=\"speakerCategory\"] > span": "Speaker Category",
    "[data-filter=\"speakerType\"] > span": "Speaker Type",
    "[data-filter=\"speakerClass\"] > span": "Speaker Class",
    "[data-filter=\"speaker\"] > span": "Speaker",
    "[data-filter=\"prefecture\"] > span": "Prefecture",
    "[data-filter=\"documentType\"] > span": "Document Type",
    ".toolbar .search-field > span": "Filter by keyword",
    ".toolbar label:nth-of-type(2) > span": "Rows per page",
    "#clearButton": "Clear",
    "[data-column-group=\"document\"]": "Document Information",
    "[data-column-group=\"triple\"]": "Causal Structure (Triple)",
    "[data-column-group=\"stakeholderOpinion\"]": "Stakeholders & Opinions",
    "[data-column=\"prefecture\"] .sort-button": "Prefecture",
    "[data-column=\"documentType\"] .sort-button": "Document Type",
    "[data-column=\"text\"] .sort-button": "Text",
    "[data-column=\"subject\"] .sort-button": "Subject",
    "[data-column=\"relation\"] .sort-button": "Relation",
    "[data-column=\"object\"] .sort-button": "Object",
    "[data-column=\"speakerCategory\"] .sort-button": "Speaker Category",
    "[data-column=\"speakerType\"] .sort-button": "Speaker Type",
    "[data-column=\"speakerClass\"] .sort-button": "Speaker Class",
    "[data-column=\"speaker\"] .sort-button": "Speaker",
    "[data-column=\"opinion\"] .sort-button": "Opinion / Response",
    "#emptyState": "No matching data.",
    "#prevButton": "Previous",
    "#nextButton": "Next",
    "#dialogTitle": "Text",
    "#textDialog .dialog-summary:first-of-type > div:first-child .detail-label": "Prefecture",
    "#textDialog .dialog-summary:first-of-type > div:last-child .detail-label": "Document Type",
    "#dialogDocLabel": "",
    "#settingsTitle": "Display settings",
    "#resetSettings": "Reset to defaults",
    "#closeSettingsBottom": "Close",
    "#closeDialogBottom": "Close"
  };
  Object.entries(textBySelector).forEach(([selector, text]) => {
    if (selector === "#dialogDocLabel") return;
    setDirectText(selector, text);
  });
  ui.annotationInput.placeholder = "Enter text to analyze";
  ui.keywordInput.placeholder = "Partial-match search of subjects, objects, and speakers";
  ui.search.placeholder = "Search all fields";
  ui.annotationOutput.textContent = "Enter text to highlight matching terms.";
  ui.keywordResults.textContent = "Enter a keyword to display candidates.";
  ui.status.textContent = "Loading…";
  [...ui.pageSize.options].forEach((option) => { option.textContent = `${option.value} rows`; });
  const dialogLabels = [...document.querySelectorAll("#textDialog .detail-label")];
  ["Prefecture", "Document Type", "Document Title", "Text", "Causal Structure (Triple)", "Speaker Category", "Speaker Type", "Speaker Class", "Speaker", "Opinion / Response"]
    .forEach((text, index) => { if (dialogLabels[index]) dialogLabels[index].textContent = text; });
  const fieldsetLegends = document.querySelectorAll("#settingsDialog legend");
  if (fieldsetLegends[0]) fieldsetLegends[0].textContent = "Search criteria to display";
  if (fieldsetLegends[1]) fieldsetLegends[1].textContent = "Data columns to display";
  const settingTranslations = {
    prefecture: "Prefecture", documentType: "Document Type", subjectObject: "Subject or Object (1)",
    relation: "Relation", subjectObject2: "Subject or Object (2)", speakerCategory: "Speaker Category",
    speakerType: "Speaker Type", speakerClass: "Speaker Class", speaker: "Speaker",
    text: "Text", subject: "Subject", object: "Object", opinion: "Opinion / Response"
  };
  document.querySelectorAll("[data-setting-filter]").forEach((input) => {
    const textNode = [...input.parentElement.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = settingTranslations[input.dataset.settingFilter];
  });
  document.querySelectorAll("[data-setting-column]").forEach((input) => {
    const textNode = [...input.parentElement.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = settingTranslations[input.dataset.settingColumn];
  });
  setDirectText("#showInstanceLabelsSetting", "Show instance labels with class labels");
  document.querySelector("#closeDialog").setAttribute("aria-label", "Close");
  document.querySelector("#closeGraphDialog").setAttribute("aria-label", "Close");
  document.querySelector("#closeSettings").setAttribute("aria-label", "Close");
  document.querySelector("#graphDialogTitle").textContent = "Causal Structure + Stakeholder Network";
  document.querySelector("#graphEmptyState").textContent = "No matching network data.";
  document.querySelector("#closeGraphDialogBottom").textContent = "Close";
  document.querySelector("#resetGraphView").textContent = "Reset view";
  document.querySelector("#graphCanvas").setAttribute("aria-label", "Causal structure and stakeholder network");
  const legendLabels = document.querySelectorAll("#graphDialog .graph-legend span");
  ["Subject / Object", "Speaker Type", "Causal relation", "Stakeholder"].forEach((text, index) => {
    if (legendLabels[index]) setDirectText(`#graphDialog .graph-legend span:nth-child(${index + 1})`, text);
  });
  ui.help.replaceChildren(
    Object.assign(document.createElement("strong"), { textContent: "The JSON file could not be loaded automatically. " }),
    document.createTextNode("Select "),
    Object.assign(document.createElement("code"), { id: "dataFileName", textContent: "refv-en-3.json" }),
    document.createTextNode(" using “Select JSON,” or open the app through a local web server.")
  );
  ui.dataFileName = document.querySelector("#dataFileName");
}

function buildPageUrl({ language = languageMode, labels = labelMode } = {}) {
  const parameters = new URLSearchParams();
  if (language === "en") parameters.set("lang", "en");
  if (labels === "instance") parameters.set("labels", "instance");
  const query = parameters.toString();
  return `${location.pathname}${query ? `?${query}` : ""}`;
}

function initializeLanguageMode() {
  const isEnglish = languageMode === "en";
  document.documentElement.lang = languageMode;
  ui.languageSwitch.textContent = isEnglish ? "日本語" : "English";
  ui.languageSwitch.lang = isEnglish ? "ja" : "en";
  ui.languageSwitch.href = buildPageUrl({ language: isEnglish ? "ja" : "en" });
  ui.dataFileName.textContent = isEnglish ? "refv-en-3.json" : "refv-ja-3.json";
}

function initializeLabelMode() {
  if (labelMode === "class") {
    ui.labelModeBadge.textContent = languageMode === "en" ? "Class-label mode" : "クラスラベル版";
    ui.labelModeSwitch.textContent = languageMode === "en" ? "Switch to instance labels" : "個別ラベル版へ";
    ui.labelModeSwitch.href = buildPageUrl({ labels: "instance" });
  } else {
    ui.labelModeBadge.textContent = languageMode === "en" ? "Instance-label mode" : "個別ラベル版";
    ui.labelModeSwitch.textContent = languageMode === "en" ? "Switch to class labels" : "クラスラベル版へ";
    ui.labelModeSwitch.href = buildPageUrl({ labels: "class" });
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
  const counts = new Map();
  const addLabel = (value, type, rowValues) => {
    if (!value) return;
    if (!labels.has(value)) labels.set(value, new Set());
    labels.get(value).add(type);
    rowValues.add(value);
  };
  rows.forEach((row) => {
    const rowValues = new Set();
    addLabel(row.values[0], "subjectObject", rowValues);
    addLabel(row.values[2], "subjectObject", rowValues);
    addLabel(row.values[6], "speaker", rowValues);
    rowValues.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  state.searchLabelCounts = counts;
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
    option.textContent = languageMode === "en" ? `${value} (0 records)` : `${value}（0件）`;
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
    ui.annotationOutput.textContent = languageMode === "en" ? "Enter text to highlight matching terms." : "テキストを入力すると、該当する単語を色付きで表示します。";
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
      const tokenText = document.createElement("span");
      tokenText.textContent = text.slice(index, bestEnd);
      const tokenCount = document.createElement("span");
      tokenCount.className = "annotation-token-count";
      tokenCount.textContent = countText(state.searchLabelCounts.get(bestValue) ?? 0);
      button.append(tokenText, tokenCount);
      button.title = languageMode === "en" ? "Select or deselect the corresponding search criterion" : "対応する絞り込み条件を選択・解除";
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
  const query = ui.keywordInput.value.trim().toLocaleLowerCase(languageMode);
  ui.keywordResultCount.textContent = "";
  if (!query) {
    ui.keywordResults.textContent = languageMode === "en" ? "Enter a keyword to display candidates." : "キーワードを入力すると候補を表示します。";
    return;
  }
  const matches = [...state.searchLabels.entries()]
    .filter(([value]) => value.toLocaleLowerCase(languageMode).includes(query))
    .sort((a, b) => {
      const aStarts = a[0].toLocaleLowerCase(languageMode).startsWith(query);
      const bStarts = b[0].toLocaleLowerCase(languageMode).startsWith(query);
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
    const typeText = types.map((type) => type === "speaker"
      ? (languageMode === "en" ? "Speaker" : "発言者")
      : (languageMode === "en" ? "Subject/Object" : "主語・目的語")).join(languageMode === "en" ? " / " : "・");
    const count = state.searchLabelCounts.get(value) ?? 0;
    typeElement.textContent = `${typeText}${languageMode === "en" ? " · " : "・"}${countText(count)}`;
    button.append(valueElement, typeElement);
    button.addEventListener("click", () => toggleAnnotationFilterValue(value, types));
    fragment.append(button);
  });
  if (matches.length === 0) {
    ui.keywordResults.textContent = languageMode === "en" ? "No matching candidates." : "一致する候補がありません。";
  } else {
    ui.keywordResults.replaceChildren(fragment);
  }
  ui.keywordResultCount.textContent = languageMode === "en"
    ? (matches.length > limit ? `(${formattedNumber(limit)} of ${countText(matches.length)})` : `(${countText(matches.length)})`)
    : (matches.length > limit ? `（${formattedNumber(matches.length)}件中${limit}件を表示）` : `（${formattedNumber(matches.length)}件）`);
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
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], languageMode));
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
  if (selected.size === 0) control.button.textContent = languageMode === "en" ? "All" : "すべて";
  else if (selected.size === 1) control.button.textContent = [...selected][0];
  else control.button.textContent = languageMode === "en" ? `${selected.size} selected` : `${selected.size}件選択`;

  const filterKey = select.closest("[data-filter]").dataset.filter;
  const fragment = document.createDocumentFragment();
  [...select.options].filter((option) => option.value).forEach((option) => {
    const label = document.createElement("label");
    label.className = "multi-select-option";
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

  const tagFragment = document.createDocumentFragment();
  [...select.selectedOptions].filter((option) => option.value).forEach((option) => {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = `filter-selection-tag filter-choice-${filterKey} is-selected`;
    tag.title = languageMode === "en" ? `Deselect ${option.value}` : `${option.value} の選択を解除`;
    const value = document.createElement("span");
    const count = Number(option.dataset.count ?? 0);
    value.textContent = languageMode === "en" ? `${option.value} (${countText(count)})` : `${option.value}（${countText(count)}）`;
    const remove = document.createElement("span");
    remove.className = "filter-selection-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-hidden", "true");
    tag.append(value, remove);
    tag.addEventListener("click", () => {
      option.selected = false;
      const hasSelection = selectedValues(select).size > 0;
      const allOption = [...select.options].find((item) => item.value === "");
      if (allOption) allOption.selected = !hasSelection;
      applyFilter();
    });
    tagFragment.append(tag);
  });
  control.tags.replaceChildren(tagFragment);
  control.tags.hidden = selected.size === 0;
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
  const tags = document.createElement("div");
  tags.className = "filter-selection-tags";
  tags.hidden = true;
  wrapper.append(button, menu);
  select.after(wrapper, tags);
  select._multiSelectControl = { button, menu, tags };

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
  entries.sort((a, b) => {
    const selectedDifference = Number(selected.has(b[0])) - Number(selected.has(a[0]));
    return selectedDifference || b[1] - a[1] || a[0].localeCompare(b[0], languageMode);
  });
  const fragment = document.createDocumentFragment();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = languageMode === "en" ? `All (${countText(total)})` : `すべて（${countText(total)}）`;
  fragment.append(allOption);
  entries.forEach(([value, count]) => {
    const option = document.createElement("option");
    option.value = value;
    option.dataset.count = String(count);
    option.textContent = languageMode === "en" ? `${value} (${countText(count)})` : `${value}（${countText(count)}）`;
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
  const terms = ui.search.value.trim().toLocaleLowerCase(languageMode).split(/\s+/).filter(Boolean);
  state.searchTerms = terms;
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
    terms.every((term) => row.values.some((value) => value.toLocaleLowerCase(languageMode).includes(term)))
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

function appendKeywordHighlightedText(container, text) {
  const value = text || "—";
  if (state.searchTerms.length === 0) {
    container.append(document.createTextNode(value));
    return;
  }
  const escapedTerms = [...new Set(state.searchTerms)]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(escapedTerms.join("|"), "giu");
  let lastIndex = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > lastIndex) container.append(document.createTextNode(value.slice(lastIndex, match.index)));
    const mark = document.createElement("mark");
    mark.className = "keyword-highlight";
    mark.textContent = match[0];
    container.append(mark);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) container.append(document.createTextNode(value.slice(lastIndex)));
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
    cell.title = languageMode === "en" ? "Selected as a search criterion" : "絞り込み条件で選択中";
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
    appendKeywordHighlightedText(tag, text);
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
      appendKeywordHighlightedText(secondary, secondaryText);
      cell.append(secondary);
    }
  } else if (column === "speakerType") {
    const tag = document.createElement("span");
    tag.className = "stakeholder-type-tag";
    appendKeywordHighlightedText(tag, text);
    cell.append(tag);
  } else {
    if (column) appendKeywordHighlightedText(cell, text);
    else cell.textContent = text || "—";
  }
  row.append(cell);
}

function renderTriple(container, subject, relation, object, secondarySubject = "", secondaryObject = "") {
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
    const secondaryText = type === "subject" ? secondarySubject : type === "object" ? secondaryObject : "";
    if (secondaryText) {
      const part = document.createElement("span");
      part.className = "dialog-triple-part";
      const secondary = document.createElement("span");
      secondary.className = "instance-label-note";
      secondary.textContent = secondaryText;
      part.append(tag, secondary);
      fragment.append(part);
    } else {
      fragment.append(tag);
    }
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

const graphNetwork = {
  nodes: [], edges: [], scale: 1, offsetX: 0, offsetY: 0,
  hovered: null, selected: null, dragNode: null, panning: false,
  pointerX: 0, pointerY: 0
};

function graphHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildGraphNetwork() {
  const nodeMap = new Map();
  const edgeMap = new Map();
  const getNode = (type, value, role = "") => {
    const label = value || "—";
    const id = `${type}:${label}`;
    if (!nodeMap.has(id)) {
      const seed = graphHash(id);
      nodeMap.set(id, {
        id, type, label, roles: new Set(),
        count: 0,
        x: type === "speaker" ? 300 + (seed % 180) : -260 + (seed % 420),
        y: ((seed >>> 8) % 900) - 450,
        vx: 0, vy: 0
      });
    }
    const node = nodeMap.get(id);
    if (role) node.roles.add(role);
    return node;
  };
  const addEdge = (source, target, label, type) => {
    const key = JSON.stringify([source.id, label, target.id, type]);
    if (!edgeMap.has(key)) edgeMap.set(key, { source, target, label, type });
  };

  state.filtered.forEach((row) => {
    const subject = getNode("entity", row.values[0], "subject");
    const object = getNode("entity", row.values[2], "object");
    const speakerType = getNode("speaker", row.values[4], "speaker");
    new Set([subject, object, speakerType]).forEach((node) => { node.count += 1; });
    addEdge(subject, object, row.values[1] || "—", "causal");
    addEdge(object, speakerType, languageMode === "en" ? "Stakeholder" : "ステークホルダー", "stakeholder");
  });
  graphNetwork.nodes = [...nodeMap.values()];
  graphNetwork.edges = [...edgeMap.values()];
  graphNetwork.hovered = null;
  graphNetwork.selected = null;
}

function layoutGraphNetwork() {
  const nodes = graphNetwork.nodes;
  const edges = graphNetwork.edges;
  const iterations = Math.min(220, Math.max(80, Math.round(90000 / Math.max(400, nodes.length))));
  for (let step = 0; step < iterations; step += 1) {
    edges.forEach((edge) => {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = edge.type === "stakeholder" ? 190 : 145;
      const force = (distance - desired) * 0.014;
      const fx = dx / distance * force;
      const fy = dy / distance * force;
      edge.source.vx += fx;
      edge.source.vy += fy;
      edge.target.vx -= fx;
      edge.target.vy -= fy;
    });

    const cells = new Map();
    nodes.forEach((node) => {
      const cellX = Math.floor(node.x / 42);
      const cellY = Math.floor(node.y / 42);
      const key = `${cellX}:${cellY}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(node);
    });
    cells.forEach((cellNodes) => {
      for (let first = 0; first < cellNodes.length; first += 1) {
        for (let second = first + 1; second < cellNodes.length; second += 1) {
          const a = cellNodes[first];
          const b = cellNodes[second];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distance = Math.hypot(dx, dy);
          if (distance < 1) { dx = 1; dy = 0; distance = 1; }
          if (distance < 34) {
            const force = (34 - distance) * 0.035;
            a.vx -= dx / distance * force;
            a.vy -= dy / distance * force;
            b.vx += dx / distance * force;
            b.vy += dy / distance * force;
          }
        }
      }
    });
    nodes.forEach((node) => {
      const targetX = node.type === "speaker" ? 330 : -100;
      node.vx += (targetX - node.x) * 0.0018;
      node.vy += -node.y * 0.0005;
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x += node.vx;
      node.y += node.vy;
    });
  }
}

function resizeGraphCanvas() {
  const rect = ui.graphCanvasWrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  ui.graphCanvas.width = Math.max(1, Math.round(rect.width * ratio));
  ui.graphCanvas.height = Math.max(1, Math.round(rect.height * ratio));
  ui.graphCanvas.style.width = `${rect.width}px`;
  ui.graphCanvas.style.height = `${rect.height}px`;
}

function fitGraphView() {
  const nodes = graphNetwork.nodes;
  if (!nodes.length) return;
  const rect = ui.graphCanvas.getBoundingClientRect();
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  graphNetwork.scale = Math.min(1.35, Math.max(0.08, Math.min((rect.width - 100) / Math.max(100, maxX - minX), (rect.height - 100) / Math.max(100, maxY - minY))));
  graphNetwork.offsetX = rect.width / 2 - (minX + maxX) / 2 * graphNetwork.scale;
  graphNetwork.offsetY = rect.height / 2 - (minY + maxY) / 2 * graphNetwork.scale;
  drawGraphNetwork();
}

function drawGraphArrow(context, sourceX, sourceY, targetX, targetY, color) {
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
  const radius = 9;
  const endX = targetX - Math.cos(angle) * radius;
  const endY = targetY - Math.sin(angle) * radius;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - Math.cos(angle - Math.PI / 6) * 8, endY - Math.sin(angle - Math.PI / 6) * 8);
  context.lineTo(endX - Math.cos(angle + Math.PI / 6) * 8, endY - Math.sin(angle + Math.PI / 6) * 8);
  context.closePath();
  context.fill();
}

function drawGraphNetwork() {
  const canvas = ui.graphCanvas;
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.save();
  context.translate(graphNetwork.offsetX, graphNetwork.offsetY);
  context.scale(graphNetwork.scale, graphNetwork.scale);

  const causalColor = "#4d78a5";
  const stakeholderColor = "#8a5a9d";
  graphNetwork.edges.forEach((edge) => {
    const color = edge.type === "stakeholder" ? stakeholderColor : causalColor;
    context.strokeStyle = color;
    context.globalAlpha = edge.type === "stakeholder" ? 0.62 : 0.42;
    context.lineWidth = 1.25 / graphNetwork.scale;
    context.beginPath();
    context.moveTo(edge.source.x, edge.source.y);
    context.lineTo(edge.target.x, edge.target.y);
    context.stroke();
    drawGraphArrow(context, edge.source.x, edge.source.y, edge.target.x, edge.target.y, color);
    if (graphNetwork.edges.length < 180 || graphNetwork.scale > 1.5) {
      context.globalAlpha = 0.9;
      context.fillStyle = color;
      context.font = `${11 / graphNetwork.scale}px "Yu Gothic UI", sans-serif`;
      context.textAlign = "center";
      context.fillText(edge.label, (edge.source.x + edge.target.x) / 2, (edge.source.y + edge.target.y) / 2 - 4 / graphNetwork.scale);
    }
  });

  context.globalAlpha = 1;
  graphNetwork.nodes.forEach((node) => {
    const active = node === graphNetwork.hovered || node === graphNetwork.selected;
    const countLabel = formattedNumber(node.count);
    const radius = (active ? 12 : 9) + Math.max(0, countLabel.length - 2) * 1.7;
    context.beginPath();
    context.arc(node.x, node.y, radius, 0, Math.PI * 2);
    context.fillStyle = node.type === "speaker" ? "#74458a" : "#285f9c";
    context.fill();
    context.lineWidth = active ? 3 / graphNetwork.scale : 1.5 / graphNetwork.scale;
    context.strokeStyle = active ? "#f2b705" : "#ffffff";
    context.stroke();
    context.font = `700 ${Math.max(7, Math.min(10, 12 - countLabel.length))}px "Yu Gothic UI", sans-serif`;
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(countLabel, node.x, node.y + 0.5);
    if (active || graphNetwork.nodes.length < 120 || graphNetwork.scale > 1.35) {
      context.font = `${active ? 13 : 11}px "Yu Gothic UI", sans-serif`;
      context.fillStyle = "#17212b";
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.fillText(`${node.label} (${countText(node.count)})`, node.x + radius + 5 / graphNetwork.scale, node.y + 4 / graphNetwork.scale);
    }
  });
  context.restore();
}

function graphNodeAt(clientX, clientY) {
  const rect = ui.graphCanvas.getBoundingClientRect();
  const x = (clientX - rect.left - graphNetwork.offsetX) / graphNetwork.scale;
  const y = (clientY - rect.top - graphNetwork.offsetY) / graphNetwork.scale;
  const radius = 14 / graphNetwork.scale;
  return [...graphNetwork.nodes].reverse().find((node) => Math.hypot(node.x - x, node.y - y) <= radius) || null;
}

function initializeGraphCanvas() {
  if (ui.graphCanvas.dataset.initialized) return;
  ui.graphCanvas.dataset.initialized = "true";
  ui.graphCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = ui.graphCanvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - graphNetwork.offsetX) / graphNetwork.scale;
    const worldY = (pointerY - graphNetwork.offsetY) / graphNetwork.scale;
    const nextScale = Math.min(4, Math.max(0.05, graphNetwork.scale * Math.exp(-event.deltaY * 0.001)));
    graphNetwork.offsetX = pointerX - worldX * nextScale;
    graphNetwork.offsetY = pointerY - worldY * nextScale;
    graphNetwork.scale = nextScale;
    drawGraphNetwork();
  }, { passive: false });
  ui.graphCanvas.addEventListener("pointerdown", (event) => {
    ui.graphCanvas.setPointerCapture(event.pointerId);
    graphNetwork.pointerX = event.clientX;
    graphNetwork.pointerY = event.clientY;
    graphNetwork.dragNode = graphNodeAt(event.clientX, event.clientY);
    graphNetwork.panning = !graphNetwork.dragNode;
  });
  ui.graphCanvas.addEventListener("pointermove", (event) => {
    if (graphNetwork.dragNode) {
      const rect = ui.graphCanvas.getBoundingClientRect();
      graphNetwork.dragNode.x = (event.clientX - rect.left - graphNetwork.offsetX) / graphNetwork.scale;
      graphNetwork.dragNode.y = (event.clientY - rect.top - graphNetwork.offsetY) / graphNetwork.scale;
    } else if (graphNetwork.panning) {
      graphNetwork.offsetX += event.clientX - graphNetwork.pointerX;
      graphNetwork.offsetY += event.clientY - graphNetwork.pointerY;
    } else {
      graphNetwork.hovered = graphNodeAt(event.clientX, event.clientY);
      ui.graphCanvas.style.cursor = graphNetwork.hovered ? "grab" : "default";
    }
    graphNetwork.pointerX = event.clientX;
    graphNetwork.pointerY = event.clientY;
    drawGraphNetwork();
  });
  const finishPointer = (event) => {
    const clickedNode = graphNetwork.dragNode || graphNodeAt(event.clientX, event.clientY);
    if (clickedNode) {
      graphNetwork.selected = clickedNode;
      ui.graphNodeDetail.hidden = false;
      ui.graphNodeDetail.textContent = `${clickedNode.type === "speaker" ? (languageMode === "en" ? "Speaker Type" : "発言者タイプ") : (languageMode === "en" ? "Subject / Object" : "主語・目的語")}: ${clickedNode.label} · ${countText(clickedNode.count)}`;
    }
    graphNetwork.dragNode = null;
    graphNetwork.panning = false;
    drawGraphNetwork();
  };
  ui.graphCanvas.addEventListener("pointerup", finishPointer);
  ui.graphCanvas.addEventListener("pointercancel", () => {
    graphNetwork.dragNode = null;
    graphNetwork.panning = false;
  });
}

function showGraphDialog() {
  buildGraphNetwork();
  ui.graphEmptyState.hidden = graphNetwork.nodes.length !== 0;
  ui.graphCanvasWrap.hidden = graphNetwork.nodes.length === 0;
  ui.graphDialogCount.textContent = languageMode === "en"
    ? `${formattedNumber(graphNetwork.nodes.length)} nodes · ${formattedNumber(graphNetwork.edges.length)} edges from ${formattedNumber(state.filtered.length)} matching records`
    : `検索結果${formattedNumber(state.filtered.length)}件から、${formattedNumber(graphNetwork.nodes.length)}ノード・${formattedNumber(graphNetwork.edges.length)}エッジを表示`;
  ui.graphNodeDetail.hidden = true;
  ui.graphDialog.showModal();
  requestAnimationFrame(() => {
    resizeGraphCanvas();
    layoutGraphNetwork();
    initializeGraphCanvas();
    fitGraphView();
  });
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
    button.textContent = languageMode === "en" ? "View" : "表示";
    button.setAttribute("aria-label", languageMode === "en" ? "View text" : "本文を表示");
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
  ui.status.textContent = languageMode === "en"
    ? `${formattedNumber(total)} of ${formattedNumber(state.all.length)} records`
    : `${formattedNumber(total)}件 / 全${formattedNumber(state.all.length)}件`;
  ui.pageInfo.textContent = languageMode === "en"
    ? (total ? `Page ${state.page} of ${pages} (${formattedNumber(start + 1)}–${formattedNumber(Math.min(start + state.pageSize, total))})` : "0 records")
    : (total ? `${state.page} / ${pages} ページ（${start + 1}–${Math.min(start + state.pageSize, total)}件）` : "0件");
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
    version: 6,
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
    input.checked = saved?.version === 6 && Array.isArray(saved?.filters)
      ? saved.filters.includes(input.dataset.settingFilter)
      : defaultVisibleFilters.has(input.dataset.settingFilter);
  });
  document.querySelectorAll("[data-setting-column]").forEach((input) => {
    input.checked = saved?.version === 6 && Array.isArray(saved?.columns)
      ? saved.columns.includes(input.dataset.settingColumn)
      : defaultVisibleColumns.has(input.dataset.settingColumn);
  });
  document.querySelector('[data-setting-option="showInstanceLabels"]').checked = saved?.version === 6
    ? saved.showInstanceLabels === true
    : true;
  applySettings({ updateData: false, save: false });
}

function showText(item) {
  ui.dialogPrefecture.textContent = item.values[9] || "—";
  ui.dialogDocumentType.textContent = item.values[10] || "—";
  ui.dialogDocLabel.textContent = item.values[11] || "—";
  ui.dialogText.textContent = item.values[8] || (languageMode === "en" ? "No text available." : "本文はありません。");
  const isClassMode = labelMode === "class";
  ui.dialogTripleLabel.textContent = languageMode === "en"
    ? (isClassMode ? "Causal Structure (Triple): Class Labels" : "Causal Structure (Triple)")
    : (isClassMode ? "因果構造（トリプル）：クラスラベル" : "因果構造（トリプル）");
  renderTriple(
    ui.dialogTriple,
    isClassMode ? item.values[14] : item.values[12],
    item.values[1],
    isClassMode ? item.values[15] : item.values[13],
    isClassMode && state.showInstanceLabels ? item.values[12] : "",
    isClassMode && state.showInstanceLabels ? item.values[13] : ""
  );
  ui.dialogSpeakerCategory.textContent = item.values[3] || "—";
  ui.dialogSpeakerType.textContent = item.values[4] || "—";
  ui.dialogSpeakerClass.textContent = item.values[5] || "—";
  ui.dialogSpeaker.textContent = item.values[6] || "—";
  ui.dialogOpinion.textContent = item.values[7] || "—";
  ui.dialog.showModal();
}

async function loadDefault() {
  try {
    const dataFile = languageMode === "en" ? "refv-en-3.json" : "refv-ja-3.json";
    const response = await fetch(dataFile);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setData(await response.json());
  } catch (error) {
    console.warn("JSONの自動読み込みに失敗しました。", error);
    ui.status.textContent = languageMode === "en" ? "JSON not loaded" : "JSON未読み込み";
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
ui.graphViewButton.addEventListener("click", showGraphDialog);
ui.resetGraphView.addEventListener("click", fitGraphView);
window.addEventListener("resize", () => {
  if (ui.graphDialog.open) {
    resizeGraphCanvas();
    fitGraphView();
  }
});
document.querySelectorAll("[data-example-index]").forEach((button) => button.addEventListener("click", () => {
  ui.annotationInput.value = annotationExamples[Number(button.dataset.exampleIndex)] ?? "";
  renderAnnotations();
  ui.annotationInput.focus();
}));
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
ui.annotationToggle.addEventListener("click", () => {
  const willOpen = ui.annotationBody.hidden;
  ui.annotationBody.hidden = !willOpen;
  ui.annotationToggle.textContent = languageMode === "en" ? (willOpen ? "Close" : "Open") : (willOpen ? "閉じる" : "開く");
  ui.annotationToggle.setAttribute("aria-expanded", String(willOpen));
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
  catch (error) {
    ui.status.textContent = languageMode === "en" ? "Load error" : "読み込みエラー";
    alert(languageMode === "en" ? `Could not load JSON.\n${error.message}` : `JSONを読み込めませんでした。\n${error.message}`);
  }
});
document.querySelector("#closeDialog").addEventListener("click", () => ui.dialog.close());
document.querySelector("#closeDialogBottom").addEventListener("click", () => ui.dialog.close());
ui.dialog.addEventListener("click", (event) => {
  const rect = ui.dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.dialog.close();
});
document.querySelector("#closeGraphDialog").addEventListener("click", () => ui.graphDialog.close());
document.querySelector("#closeGraphDialogBottom").addEventListener("click", () => ui.graphDialog.close());
ui.graphDialog.addEventListener("click", (event) => {
  const rect = ui.graphDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.graphDialog.close();
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
  document.querySelector('[data-setting-option="showInstanceLabels"]').checked = true;
  applySettings();
});
ui.settingsDialog.addEventListener("click", (event) => {
  const rect = ui.settingsDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.settingsDialog.close();
});

translateEnglishInterface();
initializeLanguageMode();
initializeLabelMode();
loadSettings();
loadDefault();
