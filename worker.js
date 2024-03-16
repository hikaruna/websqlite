import sqlite3InitModule from './node_modules/@sqlite.org/sqlite-wasm/index.mjs';

/** @type {import('@sqlite.org/sqlite-wasm').Sqlite3Static} */
const sqlite3 = await sqlite3InitModule();

if (sqlite3.oo1.OpfsDb == null) {
  throw 'OPFs VFS is not avalable';
}

const databaseFilename = (() => {
  const urlParams = new URL(self.location.href).searchParams;
  if (!urlParams.has('database')) {
    throw 'not specified database for worker';
  }
  return urlParams.get('database') + '.sqlite3';
})();

/** @type {import('@sqlite.org/sqlite-wasm').Database} */
let db = new sqlite3.oo1.OpfsDb(databaseFilename, 'c');

/**
 * @param {MessageEvent} ev 
 * @param {string} messageId
 */
const onmessageForSelectValues = (ev, messageId) => {
  const params = (() => {
    const args = ev.data?.args;
    if (typeof args === 'string') {
      return { sql: args };
    } else if (typeof args === 'object') {
      return args
    } else {
      throw 'Illegal param args sql';
    }
  })();
  const sqlValue = db.selectValues(params.sql, params.bind, params.asType);
  globalThis.postMessage({
    type: 'selectObjects',
    messageId,
    result: sqlValue,
  });
};

/**
 * 
 * @param {MessageEvent} ev 
 * @param {string} messageId 
 */
const onmessageForSelectObjects = (ev, messageId) => {
  const params = (() => {
    const args = ev.data?.args;
    if (typeof args === 'string') {
      return { sql: args };
    } else if (typeof args === 'object') {
      return args
    } else {
      throw 'Illegal param args sql';
    }
  })();
  const sqlValue = db.selectObjects(params.sql, params.bind);
  globalThis.postMessage({
    type: 'selectObjects',
    messageId,
    result: {
      sqlValue
    }
  });
};

globalThis.onmessage = (ev) => {
  const messageId = ev.data.messageId;
  if (typeof messageId !== 'string') {
    throw 'messageID is not a string'
  }
  switch (ev.data.type) {
    case 'exec':
      const args = ev.data?.args;
      if (typeof args !== 'string' && typeof args !== 'object') {
        throw 'Illegal param args sql';
      }
      const result = db.exec(args);
      globalThis.postMessage({
        type: ev.data.type,
        messageId,
        result,
      });
      break;
    case 'selectValues':
      onmessageForSelectValues(ev, messageId);
      break;
    case 'selectObjects':
      onmessageForSelectObjects(ev, messageId);
      break;
    default:
      throw 'un hundled message'
  }
}

globalThis.postMessage({
  type: 'sqlite3-api',
  result: 'worker1-ready',
});
