import { useRef } from 'react'
import { snapshot } from 'valtio'
import { toast } from 'react-toastify'
import clsx from 'clsx'

import { funcPageState } from '../../@util/GlobalValtio'

import { FSLCtrl } from '../../@cpn/FSL'

import './style.scss'

const electron = window['electron'];

export default function SearchPage(){
  const inputRef = useRef(null);

  // 進行搜尋
  const search =  async () => {
    const value = inputRef.current.value;
    if(value.trim() == ""){
      toast.error("輸入不能為空",{ toastId: "no-input" });
      return;
    }

    FSLCtrl.open('搜索中...');

    const res = await electron.invoke('search-post', { searchTarget: value });

    if(res.status == 'error'){
      toast.error(res.msg, { toastId: "search-error" });
      FSLCtrl.close();
      return;
    }

    FSLCtrl.close();

    toast.success(`搜尋完成 (耗時 ${res.porcTime}s)`);

    console.log(res);

    // funcPageState.searchBtn = 'result';
    // funcPageState.funcPage ='result';
  };

  return(<div className="search-page">
    <div className="logo"><img src="./img/telescope.svg" alt="logo" draggable="false"/></div>
    <div className="input-box fade-in">
      <button className="icon-search" onClick={search}>
        <i className='bx bx-search-alt'></i>
      </button>
      <div className="sep-h"></div>
      <input
        type="text" placeholder="巴哈ID" spellCheck="false"
        ref={inputRef} onKeyDown={(event) => { event.key === 'Enter' && search() }}
      />
      {/* <button className="search-btn"><i className='bx  bx-arrow-right'  ></i> </button> */}
    </div>
    {/* <button onClick={test}>測試</button> */}
  </div>)
}