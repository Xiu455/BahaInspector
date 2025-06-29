import { useSnapshot } from 'valtio'
import clsx from 'clsx'

import { loaddingState } from '../../@util/GlobalValtio'

// import loadImg from '../../assets/img/loading_d.svg'
import './style.scss'

export const FSLCtrl = {
  open : () => { loaddingState.isloadding = true },
  close : () => { loaddingState.isloadding = false },
  toggle : () => { 
    loaddingState.isloadding = !loaddingState.isloadding;
  },
  setMsg : (msg) => { loaddingState.message = msg },
}

export const FSL = () => {
  const state = useSnapshot(loaddingState);

  return (<div id="FSL-1" className={clsx(state.isloadding? '' : 'hid')}>
    <img src="./img/loading_d.svg" alt="loading" />
    <span>{ state.message }</span>
  </div>)
}