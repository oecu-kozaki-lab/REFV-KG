"use strict";

const fields = ["sLabel", "pLabel", "oLabel", "stClassLabel", "stLabel", "opText", "tText"];
const state = { all: [], filtered: [], page: 1, pageSize: 50 };

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
  dialog: document.querySelector("#textDialog"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogText: document.querySelector("#dialogText")
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
  applyFilter();
}

function applyFilter() {
  const terms = ui.search.value.trim().toLocaleLowerCase("ja").split(/\s+/).filter(Boolean);
  state.filtered = terms.length
    ? state.all.filter((row) => terms.every((term) => row.values.some((value) => value.toLocaleLowerCase("ja").includes(term))))
    : state.all;
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
  const rows = state.filtered.slice(start, start + state.pageSize);
  const fragment = document.createDocumentFragment();

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    appendCell(tr, String(item.sourceIndex + 1));
    item.values.slice(0, 6).forEach((value) => appendCell(tr, value));

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-button";
    button.textContent = "本文を表示";
    button.disabled = !item.values[6];
    button.addEventListener("click", () => showText(item));
    actionCell.append(button);
    tr.append(actionCell);
    fragment.append(tr);
  });

  ui.body.replaceChildren(fragment);
  ui.empty.hidden = total !== 0;
  ui.status.textContent = `${total.toLocaleString("ja-JP")}件 / 全${state.all.length.toLocaleString("ja-JP")}件`;
  ui.pageInfo.textContent = total ? `${state.page} / ${pages} ページ（${start + 1}–${Math.min(start + state.pageSize, total)}件）` : "0件";
  ui.prev.disabled = state.page <= 1;
  ui.next.disabled = state.page >= pages;
}

function showText(item) {
  ui.dialogMeta.textContent = [item.values[3], item.values[4]].filter(Boolean).join(" / ");
  ui.dialogText.textContent = item.values[6] || "本文はありません。";
  ui.dialog.showModal();
}

async function loadDefault() {
  try {
    const response = await fetch("refv-ja.json");
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
ui.pageSize.addEventListener("change", () => { state.pageSize = Number(ui.pageSize.value); state.page = 1; render(); });
ui.clear.addEventListener("click", () => { ui.search.value = ""; applyFilter(); ui.search.focus(); });
ui.prev.addEventListener("click", () => { state.page -= 1; render(); scrollTo({ top: 0, behavior: "smooth" }); });
ui.next.addEventListener("click", () => { state.page += 1; render(); scrollTo({ top: 0, behavior: "smooth" }); });
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
