import { useSnapshot } from 'valtio'
import { AutoSizer, List } from 'react-virtualized'

import {
  funcPageState,
  searchResultState
} from '../../@util/GlobalValtio'

import Link from '../../@cpn/Link'

import './style.scss'

const electron = window['electron'];

export default function ResultPage(){
  const srSnap = useSnapshot(searchResultState);

  // console.log(srSnap);

  const backClick = () => {
    funcPageState.searchBtn = 'search';
    funcPageState.funcPage = 'search';
  }

  return(<div className="result-page">
    <div className="t1">
        <button className='func btn back' onClick={backClick}><i className='bx bxs-reply'></i></button>
        <Link className='func btn st' href={srSnap.targetUrl}>{srSnap.searchTarget}</Link>
        <input type="text" className="func si" placeholder="關鍵字搜尋(Enter 進行搜尋)" />
        <div className='func btn download' onClick={() => {}}><i className='bxr  bx-arrow-in-down-square-half'></i> </div>
    </div>

    <div className="t2">
      <div className="post-list-box">
        <div className="post-list">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height} width={width} rowHeight={100}
                rowCount={srSnap.postListData.length}
                rowRenderer={({ index, key, style }) => {
                  const postData = srSnap.postListData[index];

                  return(<button key={key} style={style} className="post-data-box">
                    <div className="post-data">
                      <div className="title"><span className="ellipsis">{ postData.title }</span></div>
                      <div className="date">{ postData.date }</div>
                      <div className="type">{ postData.type }</div>
                      <div className="gp-count">{ `GP ${postData.gp}` }</div>
                      <div className="content"><span className="ellipsis">{ postData.content }</span></div>
                    </div>
                  </button>)
                }}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    </div>

    <div className="t3">
      
    </div>
  </div>)
}