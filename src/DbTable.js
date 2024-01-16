import { LitElement, html } from 'lit';

export class DbTable extends LitElement {
  static properties = {
    name: { type: String },
    columns: { type: Array },
    rows: { type: Array },
  };

  constructor() {
    super();

    /** @type {string} */
    // @ts-ignore
    this.name;

    /** @type {string[]} */
    this.columns = [];

    /** @type {{[x: string]: import("@sqlite.org/sqlite-wasm").SqlValue}[]} */
    this.rows = [];
  }

  render() {
    return html`
      <link rel="stylesheet" href="https://unpkg.com/mvp.css">
      <table>
        <caption>${this.name}</caption>
        <thead>
          <tr>
            ${this.columns.map(column => (html`<th>${column}</th>`))}
          </tr>
        </thead>
        <tbody>
          ${this.rows.map(row => (html`
            <tr>
              ${this.columns.map(column => (html`
                <td>${row[column]}</td>
              `))}
            </tr>
          `))}
        </tbody>
      </table>
    `;
  }
}
customElements.define('db-table', DbTable);
