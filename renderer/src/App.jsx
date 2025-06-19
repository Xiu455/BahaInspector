import { useState, useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'

import './App.scss'

const electron = window['electron'];  // 獲得後端溝通API

let stateProxy = proxy({
  count: 0
})

function App(props){
  let {
    setting,
    ...rest
  } = props;

  const state = useSnapshot(stateProxy);

  const callBE = () => {
    electron.send('send', 'Hello from frontend');
  }

  useEffect(() => {
    electron.receive('backend-reply', (data) => {
      console.log('收到後端回覆');
      console.log(data);
    });

    electron.receive('backend-notify', (data) => {
      console.log('主進程通知:', data);
  });
  },[]);

  return (<>
    <button onClick={() => stateProxy.count++}>
      點擊次數: { state.count }
    </button>

    <button onClick={callBE}>
      發送訊息到後端
    </button>
  </>)
}

export default App