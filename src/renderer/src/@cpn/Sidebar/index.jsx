import './style.scss'

export default function Sidebar(){
  return(<div className="sidebar">
    <div className="logo"><img src="./img/telescope.svg" alt="logo" draggable="false" /></div>

    <div className="button-area"></div>

    <button className="setting-btn">
      <img src="./img/setting.svg" className="icon" draggable="false" />
      <span>設定</span>
    </button>
  </div>)
}