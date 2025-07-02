import { snapshot } from 'valtio'
import clsx from 'clsx';

import './style.scss'

export default function SearchPage(){
  return(<div className="search-page">
    <div className="logo"><img src="./img/telescope.svg" alt="logo" draggable="false"/></div>
    <div className="input-box fade-in">
      <button className="icon-search"><i className='bx bx-search-alt'></i></button>
      <div className="sep-h"></div>
      <input type="text" placeholder="巴哈ID" />
      {/* <button className="search-btn"><i className='bx  bx-arrow-right'  ></i> </button> */}
    </div>
  </div>)
}