import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { List, AutoSizer } from 'react-virtualized';

import {  } from './@util/GlobalValtio'

import { FSL, FSLCtrl } from './@cpn/FSL'
import Sidebar from './@cpn/Sidebar';


import './App.scss'

const electron = window['electron'];  // 獲得後端溝通API

function App(props){

  useEffect(() => {
    const init = async () => {
      FSLCtrl.setMsg('讀取設定檔中...');
      const config = await electron.invoke('get-config');

      FSLCtrl.close();
    }

    init();
  }, []);

  const items = new Array(500).fill(0).map((_, index) => `Item ${index}`);

  return (<>
    <FSL />

    <Sidebar />

    <div className='func-page-area'>

    </div>
  </>)
}

export default App

{/* <div className="list">
  <AutoSizer>
    {({ height, width }) => (
      <List
        height={height}
        width={width}
        rowCount={items.length}
        rowHeight={50}
        rowRenderer={({ index, key, style }) => (
          <div key={key} style={style}>
            {items[index]}
          </div>
        )}
      />
    )}
  </AutoSizer>
</div> */}