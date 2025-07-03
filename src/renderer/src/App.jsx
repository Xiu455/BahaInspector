import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

// import { List, AutoSizer } from 'react-virtualized'
import { ToastContainer, toast } from 'react-toastify';

import {
  funcPageState,
  configState,
} from './@util/GlobalValtio'

import { FSL, FSLCtrl } from './@cpn/FSL'
import Sidebar from './@cpn/Sidebar'

import {
  SettingPage,
  SearchPage,
} from './@FPage'

import 'react-toastify/dist/ReactToastify.css';
import './App.scss'

const electron = window['electron'];  // 獲得後端溝通API

function App(props){
  const pageSnap = useSnapshot(funcPageState);

  useEffect(() => {
    const init = async () => {
      FSLCtrl.setMsg('讀取設定檔中...');
      const config = await electron.invoke('get-config');
      Object.assign(configState, config);

      FSLCtrl.setMsg('檢查BAHARUNE Token中...');
      if(configState.BAHARUNE === ''){
        toast.warn('尚未設定 BAHARUNE Token 請前往設定頁面設定', {toastId: 'token-warn'});
      }else{
        const tokenStatus = await electron.invoke('check-token', { token: configState.BAHARUNE });
        if(!tokenStatus){
          toast.warn('BAHARUNE Token 已失效 請重新設定', {toastId: 'token-fail', autoClose: false});
        }
      }

      FSLCtrl.close();
    }

    init();

    const setLoadingMsgEvent = (msg) => {
      FSLCtrl.setMsg(msg);
    }
    electron.receive('set-loading-msg', setLoadingMsgEvent);

    return () => {
      electron.off('set-loading-msg', setLoadingMsgEvent);
    }
  }, []);

  return (<>
    <Sidebar />

    <div className='func-page-area'>{(() => {
      switch(pageSnap.funcPage){
        case 'search':
          return <SearchPage />
        case 'setting':
          return <SettingPage />
        default:
          return <div>頁面不存在</div>
      }
    })()}</div>

    <FSL />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
    />
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