//@ts-check
import { Grid, html } from "gridjs"
import { default as sqlite3InitModule } from "@sqlite.org/sqlite-wasm"

const sqlite3 = await sqlite3InitModule();
console.log("Loaded sqlite3", sqlite3);
const db = new sqlite3.oo1.JsStorageDb("local");
// @ts-ignore
window.db = db;

function showTables() {
  const tablesSectionList = /** @type {HTMLUListElement} */ (document.querySelector('#tables > ul'));
  const tableTemplate = /** @type {HTMLTemplateElement} */ (document.querySelector('#table-template'));
  const tableNames = /** @type {String[]} */ (db.selectValues(`select name from sqlite_master where type='table'`));
  for (const tableName of tableNames) {
    const clone = /** @type {DocumentFragment} */ (tableTemplate.content.cloneNode(true));
    const caption = /** @type {HTMLTableCaptionElement} */ (clone.querySelector('caption'));
    caption.textContent = tableName;
    const headerRow = /** @type {HTMLTableRowElement} */ (clone.querySelector('thead > tr'));

    const columnNames = /** @type {String[]} */ (db.selectValues(`SELECT name FROM pragma_table_info('${tableName}')`));
    for (const columnName of columnNames) {
      headerRow.appendChild((() => {
        const th = document.createElement('th');
        th.textContent = columnName;
        return th;
      })())
    }
    const tableBody = /** @type {HTMLElement} */ (clone.querySelector('tbody'));
    const rows = /** @type {Object[]} */ (db.selectObjects(`SELECT ${columnNames.join(' ')} FROM ${tableName}`));
    for (const row of rows) {
      tableBody.appendChild((() => {
        const tr = document.createElement('tr');
        for (const value of Object.values(row)) {
          tr.appendChild((() => {
            const td = document.createElement('td');
            td.textContent = value;
            return td;
          })());
        }
        return tr;
      })());
    }

    tablesSectionList.appendChild(clone);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", showTables);
} else {
  showTables();
}


/**
 * 
 * @param {Event} e 
 */
function execSql(e) {
  const resultList = /** @type {HTMLUListElement} */ (document.querySelector("#result-list"));
  const resultTemplate = /** @type {HTMLTemplateElement} */ (document.querySelector("#result-template"));
  const sqlField = /** @type {HTMLInputElement} */ (document.getElementById("sql-text"));

  try {

    const result = db.selectObjects(sqlField.value);

    const clone = /** @type {DocumentFragment} */ (resultTemplate.content.cloneNode(true));
    const p = /** @type {HTMLParagraphElement} */ (clone.querySelector('p'));
    p.textContent = sqlField.value;

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

    resultList.insertAdjacentElement('afterbegin', /** @type {Element} */(clone.firstElementChild));
    console.log(result);
    sqlField.value = '';
  } catch (e) {
    switch (true) {
      case e instanceof sqlite3.SQLite3Error:

        const clone = /** @type {DocumentFragment} */ (resultTemplate.content.cloneNode(true));
        const p = /** @type {HTMLParagraphElement} */ (clone.querySelector('p'));
        p.textContent = sqlField.value;
        clone.firstElementChild?.appendChild((() => {
          const p = document.createElement('p');
          p.textContent = e.message;
          return p;
        })());

        resultList.insertAdjacentElement('afterbegin', /** @type {Element} */(clone.firstElementChild));
        sqlField.value = '';
        console.error(e);
        break;
      default:
        throw e;
    }
  }
};
// @ts-ignore
window.execSql = execSql;
