import { DbTables } from './src/DbTables.js';
import { DbTable } from "./src/DbTable.js";
import { html, render } from "lit";
import promiserFactory from './sqlite3-worker1-promiser.mjs';


const database = new URL(window.location.href).searchParams.get('database');
if (database == null) {
  throw 'database did not specify'
}

/** @type {Map<string, Function>} */
const messageCbQueue = new Map();;

/** @type {Worker} */
const worker = await new Promise((resolve, reject) => {
  const worker = new Worker(`worker.js?database=${database}`, { type: 'module' });
  worker.onmessage = (ev) => {
    switch (ev.data?.type) {
      case 'sqlite3-api':
        const result = ev.data?.result;
        if (result !== 'worker1-ready') {
          throw 'worker1 is not ready';
        }
        resolve(worker);
        break;
      case 'exec':
      case 'selectValues':
      case 'selectObjects':
        const messageId = ev.data?.messageId;
        if(typeof messageId !== 'string') {
          throw 'Illegal messageId';
        }
        const cb = messageCbQueue.get(messageId);
        if(typeof cb !== 'function') {
          throw `not found callback for ${messageId}`
        }
        messageCbQueue.delete(messageId);
        cb(ev.data?.result);
        break;
      default:
        throw 'unhandle message';
    }
  };
});
//const promiser = await promiserFactory({ worker: () => (new Worker(`worker.js?database=${database}`, { type: 'module' })) });

//const result = await promiser('open', { filename: `${database}.sqlite3` });
/**
 * @param {string} type 
 * @param {object} args 
 */
const postMessage = async (type, args) => {
  const result = await new Promise((resolve) => {
    const messageId = crypto.randomUUID();
    messageCbQueue.set(messageId, (result) => {
      resolve(result);
    });
    worker.postMessage({
      type,
      messageId,
      args
    });
  });
  return result;
};

class WokerProxyDb {
  /**
   * @param {Worker} worker 
   */
  constructor(worker) {
    this.worker = worker;
  }


  async exec(sql) {
    await postMessage('exec', sql);
  }

  async selectObjects(sql, bind=undefined) {
    return await postMessage('selectObjects', { sql, bind });
  }
  async selectValues(sql, bind=undefined) {
    return await postMessage('selectValues', { sql, bind });
  }
}

const db = new WokerProxyDb(worker);

await db.exec('create table if not exists t(a,b)');
console.log(`exec,{ sql: 'create table if not exists t(a,b)' }}`);
await db.exec('insert into t(a,b) values (1,2)');
console.log(`exec,{ sql: 'insert into t(a,b) values (1,2)' }}`);
const result = await db.selectObjects('insert into t(a,b) values (1,2)');
console.log(`exec,{ sql: 'select * from t' }}→result=${JSON.stringify(result)}`);

// @ts-ignore
window.db = db;

async function showTables() {
  const tableNames = /** @type {String[]} */ (await db.selectValues(`select name from sqlite_master where type='table'`));
  const dbTables = /** @type {DbTables} */ (document.querySelector('#db-tables'));
  const myTables /** @type {import("./src/DbTables.js").Table[]} */ = tableNames.map(async tableName => {
    const columns = /** @type {String[]} */ await db.selectValues(`SELECT name FROM pragma_table_info('${tableName}')`);
    const rows = (await db.selectObjects(`SELECT ${columns.join(', ')} FROM ${tableName}`)).map(row => ({ ...row }))
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
  await showTables();
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

    const result = (() => {

      const stmt = db.prepare(sqlField.value);
      try {
        const columns = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) {
          const row = stmt.get({});
          rows.push(row);
        }

        return {
          name: sqlField.value,
          columns,
          rows,
        }
      } finally {
        stmt.finalize();
      }
    })();

    const dbTableElm = /** @type {DbTable} */(document.createElement('db-table'));
    dbTableElm.name = result.name;
    dbTableElm.columns = result.columns;
    dbTableElm.rows = result.rows;

    const liElm = document.createElement('li');
    liElm.appendChild(dbTableElm);

    resultList.insertAdjacentElement('afterbegin', liElm);
    console.log(result);
    sqlField.value = '';
    showTables();
  } catch (e) {
    switch (true) {
      case e instanceof sqlite3.SQLite3Error:
        const liElm = document.createElement('li');
        render(html`
          <p>${sqlField.value}</p>
          <p>${e.message}</p>
        `, liElm);

        resultList.insertAdjacentElement('afterbegin', liElm);
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
    memDb.onclose = { after: function () { sqlite3.wasm.dealloc(p) } };
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
