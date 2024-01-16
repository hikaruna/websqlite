import { LitElement, html } from 'lit';
import { DbTable } from './DbTable.js';

/**
 * @typedef {{[columnName: string]: import('@sqlite.org/sqlite-wasm').SqlValue}} Row
 * @typedef {{name: string, columns: string[], rows: Row[]}} Table
 */

export class DbTables extends LitElement {
  static properties = {
    tables: { type: Array },
  };

  /**
   * @param tables {Table[]}
   */
  constructor(tables = []) {
    super();
    /** @type {Table[]} */
    this.tables = tables;
  }

  render() {
    return html`
      <link rel="stylesheet" href="https://unpkg.com/mvp.css">
      <ul>
        ${this.tables.map(table => (html`
          <li><db-table .name=${table.name} .columns=${table.columns} .rows=${table.rows} />
        `))}
      </ul>
    `;
  }
}
customElements.define('db-tables', DbTables);
