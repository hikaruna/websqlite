//@ts-check
import {default as sqlite3InitModule} from "@sqlite.org/sqlite-wasm"

const sqlite3 = await sqlite3InitModule();
console.log("Loaded sqlite3", sqlite3);
const db = new sqlite3.oo1.JsStorageDb("local");
// @ts-ignore
window.db = db;

const resultList = /** @type {HTMLUListElement} */ (document.querySelector("#result-list"));
const resultTemplate = /** @type {HTMLTemplateElement} */ (document.querySelector("#result-template"));
const sqlField = /** @type {HTMLInputElement} */ (document.getElementById("sql-text"));
const execButton = /** @type {HTMLButtonElement} */ (document.getElementById('exec-button'));

/**
 * 
 * @param {Event} e 
 */
function execSql(e) {
  const result = db.exec(sqlField.value, {returnValue: 'resultRows'});

  const clone = /** @type {HTMLElement} */ (resultTemplate.content.cloneNode(true));
  /** @type {HTMLParagraphElement} */ (clone.querySelector('p')).textContent = sqlField.value;
  /** @type {HTMLTextAreaElement} */ (clone.querySelector('textarea')).value = JSON.stringify(result);
  resultList.appendChild(clone);
  console.log(result);
  sqlField.value = '';
  e.preventDefault();
};

/** @type {HTMLFormElement} */(document.getElementsByTagName('form')[0]).onsubmit = execSql;
