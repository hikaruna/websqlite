//@ts-check
import { Grid, html } from "gridjs"
import { default as sqlite3InitModule } from "@sqlite.org/sqlite-wasm"

const sqlite3 = await sqlite3InitModule();
console.log("Loaded sqlite3", sqlite3);
const db = new sqlite3.oo1.JsStorageDb("local");
// @ts-ignore
window.db = db;

const resultList = /** @type {HTMLUListElement} */ (document.querySelector("#result-list"));
const resultTemplate = /** @type {HTMLTemplateElement} */ (document.querySelector("#result-template"));
const sqlField = /** @type {HTMLInputElement} */ (document.getElementById("sql-text"));

/**
 * 
 * @param {Event} e 
 */
function execSql(e) {
  const result = db.selectObjects(sqlField.value);

  const clone = /** @type {DocumentFragment} */ (resultTemplate.content.cloneNode(true));
  /** @type {HTMLParagraphElement} */ (clone.querySelector('p')).textContent = sqlField.value;
  const table = /** @type {HTMLTableElement} */ (clone.querySelector('table'));
  if (result.length > 0) {
    const firstRow = result[0];
    table.appendChild((() => {
      const tr = document.createElement('tr');

      for (const column of Object.keys(firstRow)) {
        tr.appendChild((() => {
          const th = document.createElement('th');
          th.textContent = column;
          return th;
        })());
      }

      return tr;
    })());
  }

  for (const row of result) {
    table.appendChild((() => {
      const tr = document.createElement('tr');

      for (const value of Object.values(row)) {
        tr.appendChild((() => {
          const td = document.createElement('td');
          td.textContent = `${value}`;
          return td;
        })());
      }

      return tr;
    })());
  }

  resultList.insertAdjacentElement('afterbegin', /** @type {Element} */ (clone.firstElementChild));
  console.log(result);
  sqlField.value = '';
};
// @ts-ignore
window.execSql = execSql;
