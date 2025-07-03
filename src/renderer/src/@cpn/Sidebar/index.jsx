import { useSnapshot } from 'valtio'
import { funcPageState } from '../../@util/GlobalValtio'

import './style.scss'

const FuncBtnBox = ({title, children}) => {
  return(<div className="func-btn-box">
    <div className="title">{title}</div>
    <div className="btn-box">
      {children}
    </div>
  </div>)
}

const BtnS1 = (props) => {
  const {
    icon,
    children,
    text,
    ...rest
  } = props

  return(<button className='btn-S1 fade-in' {...rest}>
    <div className="icon">{icon ?? ''}</div>
    <span>{children ?? <p>{text}</p>}</span>
  </button>)
}

export default function Sidebar(){
  const funcPageSnap = useSnapshot(funcPageState);

  return(<div className="sidebar">
    <div className="button-area">
      <FuncBtnBox title="功能頁">
        <BtnS1
          text='搜尋文章'
          icon={<i className='bx bx-article'></i> }
          onClick={() => funcPageState.funcPage = funcPageSnap.searchBtn}
        />
      </FuncBtnBox>
    </div>

    <div className="sep-w"></div>

    <button
      className="setting-btn fade-in"
      onClick={() => funcPageState.funcPage = 'setting'}
    >
      <div className="icon"><i className='bxr bx-cog'></i></div>
      <span>設定</span>
    </button>
  </div>)
}