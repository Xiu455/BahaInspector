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

  const callBeEvent1 = async () => {
    const result = await electron.invoke('event1');
    console.log(result);
  }

  const callBeEvent2 = async () => {
    const result = await electron.invoke('event2');
    console.log(result);
  }

  const callBeEvent3 = async () => {
    const result = await electron.invoke('event3');
    console.log(result);
  }

  return (<>
    <button onClick={() => stateProxy.count++}>
      點擊次數: { state.count }
    </button>

    <button onClick={callBeEvent1}>
      後端事件1
    </button>

    <button onClick={callBeEvent2}>
      後端事件2
    </button>

    <button onClick={callBeEvent3}>
      後端事件3
    </button>
  </>)
}

export default App