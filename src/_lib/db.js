import path from 'path'

import { DatabaseSync } from 'node:sqlite'

import ROOTDIR from '../_utils/getRootDir.js'

const db = new DatabaseSync(path.join(ROOTDIR, '_data/save.db'));

export default db;