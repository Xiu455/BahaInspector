import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { List, AutoSizer } from 'react-virtualized'

import {
  funcPageState,
  configState,
} from './@util/GlobalValtio'

import { FSL, FSLCtrl } from './@cpn/FSL'
import Sidebar from './@cpn/Sidebar'

import { SettingPage } from './@FPage'

import './App.scss'

const electron = window['electron'];  // 獲得後端溝通API

function App(props){
  const pageSnap = useSnapshot(funcPageState);

  useEffect(() => {
    const init = async () => {
      FSLCtrl.setMsg('讀取設定檔中...');
      const config = await electron.invoke('get-config');
      Object.assign(configState, config)
      console.log(configState);

      FSLCtrl.close();
    }

    init();

    return () => {

    }
  }, []);

  return (<>
    <FSL />

    <Sidebar />

    <div className='func-page-area'>{(() => {
      switch(pageSnap.funcPage){
        case 'search':
          return <div>搜尋頁面</div>
        case 'setting':
          return <SettingPage />
        default:
          return <div>頁面不存在</div>
      }
    })()}</div>
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