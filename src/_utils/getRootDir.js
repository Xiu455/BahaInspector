import path from 'path'

import isDev from 'electron-is-dev'

const ROOTDIR = isDev?
    process.cwd() 
    :
    path.join(process.cwd(),'resources/app')
;

export default ROOTDIR;