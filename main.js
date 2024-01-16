import { default as sqlite3InitModule } from "@sqlite.org/sqlite-wasm"
import { DbTables } from './src/DbTables.js';


const sqlite3 = await sqlite3InitModule();
console.log("Loaded sqlite3", sqlite3);
const db = new sqlite3.oo1.JsStorageDb("local");
// @ts-ignore
window.db = db;

function showTables() {
  const tableNames = /** @type {String[]} */ (db.selectValues(`select name from sqlite_master where type='table'`));
  const dbTables = /** @type {DbTables} */ (document.querySelector('#db-tables'));
  const myTables /** @type {import("./src/DbTables.js").Table[]} */ = tableNames.map(tableName => {
    const columns = /** @type {String[]} */ (db.selectValues(`SELECT name FROM pragma_table_info('${tableName}')`));
    const rows = db.selectObjects(`SELECT ${columns.join(', ')} FROM ${tableName}`).map(row => ({ ...row}))
    return {
      name: tableName,
      columns,
      rows
    }
  });
  dbTables.tables = myTables;
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
    showTables();
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

function exportDb() {
  const byteArray = sqlite3.capi.sqlite3_js_db_export(db);
  const blob = new Blob([byteArray.buffer],
    { type: "application/x-sqlite3" });
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.href = window.URL.createObjectURL(blob);
  a.download = ("my.sqlite3");
  a.addEventListener('click', function () {
    setTimeout(function () {
      console.log("Exported (possibly auto-downloaded) database");
      window.URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  });
  a.click();
}
// @ts-ignore
window.exportDb = exportDb;

function importDb() {
  const loadDbForm = /** @type {HTMLInputElement} */ (document.querySelector('#load-db'));
  const f = loadDbForm.files?.[0];
  if (!f) return;
  const r = new FileReader();
  r.addEventListener('load', function () {
    const arrayBuffer = /** @type {ArrayBuffer} */(this.result);
    const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer);
    const memDb = new sqlite3.oo1.DB();
    memDb.onclose = {after: function(){sqlite3.wasm.dealloc(p)}};
    const rc = sqlite3.capi.sqlite3_deserialize(
        /** @type {Number} */(memDb.pointer), 'main', p, arrayBuffer.byteLength, arrayBuffer.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
    );
    memDb.checkRc(rc);

    try {
      memDb.exec("VACUUM INTO 'file:local?vfs=kvvfs'");
      showTables();
      loadDbForm.value = '';
    } catch (e) {
      switch (true) {
        case e instanceof sqlite3.SQLite3Error:
          console.error(e);
          alert(e.message);
          break;
        default:
          throw e;
      }
    } finally {
      memDb.close();
    }

  });
  r.readAsArrayBuffer(f);
}
// @ts-ignore
window.importDb = importDb;

function clearDb() {
  const result = confirm('本当に？');

  if (result) {
    db.clearStorage();
    showTables();
  }
}
// @ts-ignore
window.clearDb = clearDb;
