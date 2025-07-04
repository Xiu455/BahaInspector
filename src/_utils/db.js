const path = require('path')
const isDev = require('electron-is-dev')
const Database = require('better-sqlite3')

const ROOTDIR = isDev?
  process.cwd() :
  path.join(process.cwd(),'resources/app');

const db = new Database(path.join(ROOTDIR, '_data/save.db'));

module.exports = db;