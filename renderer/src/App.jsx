import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import {  } from './@util/GlobalValtio'

import { FSL, FSLCtrl } from './@cpn/FSL'

import './App.scss'

const electron = window['electron'];  // 獲得後端溝通API

function App(props){

  useEffect(() => {
    const init = async () => {
      FSLCtrl.setMsg('讀取設定檔中...');
      const config = await electron.invoke('get-config');
      console.log(config);
      FSLCtrl.close();
    }

    init();
  }, []);

  return (<>
    <FSL />
  </>)
}

export default App