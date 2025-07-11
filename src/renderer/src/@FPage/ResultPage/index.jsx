import { useState, useEffect } from 'react'
import { useSnapshot, proxy, snapshot } from 'valtio'
import { AutoSizer, List } from 'react-virtualized'
import { toast } from 'react-toastify'
import clsx from 'clsx'

import {
  funcPageState,
  searchFilterState,
  searchResultState
} from '../../@util/GlobalValtio'

import { FSLCtrl } from '../../@cpn/FSL'
import Link from '../../@cpn/Link'
import RatioBar from '../../@cpn/RatioBar'

import './style.scss'

const electron = window['electron'];
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const search = async () => {
  const { searchTarget, isTmp } = searchResultState;
  const postListData = await electron.invoke('search', {
    searchTarget,
    isTmp,
    searchFilter: snapshot(searchFilterState)
  });

  searchResultState.postListData = postListData;
}

const TypeRank = ({ srSnap }) => {
  const [ratioArr, setRatioArr] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      setRatioArr(srSnap.typeNum.map(typeData => (typeData.count / srSnap.postCount) * 100));
    }, 500);
  },[]);

  // 類型搜尋
  const typeSearch = async (e) => {
    e = e.currentTarget;
    const type = e.dataset.type;

    searchFilterState.type = type;
    await search();
  }

  return (<div className="type-rank-box">
    {/* <div className="post-total">文章總數: {searchResultState.postCount}</div> */}
    <div className="type-rank">
      {srSnap.typeNum.map(( typeData, index ) => {
        const ratio = (typeData.count / srSnap.postCount) * 100;
        const colorMap = {
          '': 'rgb(255, 255, 255)',
          '場外綜合': 'rgb(28, 255, 198)',
          '政治議題': 'rgb(255, 72, 72)',
          '回收專區': 'rgb(0, 0, 0)',
          '生活百態': 'rgb(250, 213, 158)',
          '新聞焦點': 'rgb(64, 0, 182)',
          '動漫遊戲': 'rgb(130, 180, 255)',
          '心情點滴': 'rgb(255, 200, 220)',
          '綜合娛樂': 'rgb(255, 230, 110)',
          '創作天地': 'rgb(180, 140, 255)',
          '技藝知識': 'rgb(100, 200, 160)',
          '大樓專區': 'rgb(200, 200, 200)',
          '吵架擂台': 'rgb(255, 100, 100)',
          '疑難求助': 'rgb(140, 220, 240)',
          '食趣旅遊': 'rgb(255, 180, 100)',
          '板務公告': 'rgb(239, 255, 17)'
        };
        
        return(<button
          key={index}
          className={clsx('type-rank-item btn-df', (searchFilterState.type === typeData.type) && "selected")}
          data-type={typeData.type}
          onClick={typeSearch}
        >
          <RatioBar
            ratio={ratioArr[index]}
            bgc={colorMap[typeData.type] || 'rgb(54, 208, 255)'}
          >
            <span className="type-name">{typeData.type || '空白'}</span>
            <div className="type-count">
              {typeData.count} | <span className="type-ratio">{ratio.toFixed(1)}%</span>
            </div>
          </RatioBar>
        </button>)
      })}
    </div>
  </div>)
}

const PostInfo = ({ srSnap }) => {
  const [ postInfo, setPostInfo ] = useState({
    NRE:{
      count: 0,
      count_ratio: 0,
      gp: 0,
      gp_ratio: 0,
    },
    RE:{
      count: 0,
      count_ratio: 0,
      gp: 0,
      gp_ratio: 0,
    },
  });

  useEffect(() => {
    setPostInfo({
      NRE:{
        count: srSnap.postInfo.NRE_count,
        count_ratio: (srSnap.postInfo.NRE_count / srSnap.postCount) * 100,
        gp: srSnap.postInfo.NRE_gp,
        gp_ratio: (srSnap.postInfo.NRE_gp / srSnap.postInfo.total_gp) * 100,
      },
      RE:{
        count: srSnap.postInfo.RE_count,
        count_ratio: (srSnap.postInfo.RE_count / srSnap.postCount) * 100,
        gp: srSnap.postInfo.RE_gp,
        gp_ratio: (srSnap.postInfo.RE_gp / srSnap.postInfo.total_gp) * 100,
      },
    });
  }, []);

  useEffect(() => {
    console.log(postInfo);
  }, [postInfo]);

  return (<div className="post-info-box fc2">
      <div className="post-info-total fc1">
        <span>文章總數: {srSnap.postCount}</span>
        <span>GP總數: {srSnap.postInfo.total_gp}</span>
      </div>

      <div className="post-info-postCount fc2">
        <RatioBar ratio={postInfo.NRE.count_ratio} bgc="rgb(0, 140, 255)">
          <div className="post-info-item">
            發文數 
            <span className="num">{postInfo.NRE.count} |</span> 
            <span className="ratio">{postInfo.NRE.count_ratio.toFixed(1)}%</span>
          </div>
        </RatioBar>
        <RatioBar ratio={postInfo.RE.count_ratio} bgc="rgb(179, 47, 255)">
          <div className="post-info-item">
            回應數
            <span className="num">{postInfo.RE.count} |</span>
            <span className="ratio">{postInfo.RE.count_ratio.toFixed(1)}%</span>
          </div>
        </RatioBar>
      </div>

      <div className="post-info-gp fc2">
        <RatioBar ratio={postInfo.NRE.gp_ratio} bgc="rgb(0, 140, 255)">
          <div className="post-info-item">
            發文總GP
            <span className="num">{postInfo.NRE.gp} |</span>
            <span className="ratio">{postInfo.NRE.gp_ratio.toFixed(1)}%</span>
          </div>
        </RatioBar>
        <RatioBar ratio={postInfo.RE.gp_ratio} bgc="rgb(179, 47, 255)">
          <div className="post-info-item">
            回應總GP
            <span className="num">{postInfo.RE.gp} |</span>
            <span className="ratio">{postInfo.RE.gp_ratio.toFixed(1)}%</span>
          </div>
        </RatioBar>
      </div>
  </div>)
}

const FShowState = proxy({isOpen: false, postData: {}});
const FShow = () => {
  const FShowSnap = useSnapshot(FShowState);

  const isImgUrl = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(FShowSnap.postData.content);

  const closeClick = () => {
    FShowState.isOpen = false;
  }

  return (<div
    className={clsx(
      "f-show-box",
      FShowSnap.isOpen && "f-show-box-open"
    )}
  >
    <button className="close-f btn-df" onClick={closeClick}></button>

    <div className="f-show">
      <button className="close btn-df" onClick={closeClick}>
        <i className="bxr bx-x"/>
      </button>

      <div className="info">
        {FShowSnap.postData.date && <span>{FShowSnap.postData.date}</span>}
        {FShowSnap.postData.type && <span>{FShowSnap.postData.type}</span>}
        {FShowSnap.postData.gp && <span>GP {FShowSnap.postData.gp}</span>}
      </div>
      <div className="title"><span>{FShowSnap.postData.title}</span></div>

      <div className="content">{
        isImgUrl?
          <img src={FShowSnap.postData.content} alt={FShowSnap.postData.title} /> : 
          <span>{FShowSnap.postData.content}</span>
      }</div>

      <Link className="link" href={FShowSnap.postData.url} target="_blank">查看原文</Link>
    </div>
  </div>);
}

export default function ResultPage(){
  const [ KeywordIn, setKeywordIn ] = useState('');
  const [ keyword, setKeyword ] = useState([]);
  const [showDlTypeList, setShowDlTypeList ] = useState(false);

  const srSnap = useSnapshot(searchResultState);

  // 回到搜尋頁面
  const backClick = () => {
    funcPageState.searchBtn = 'search';
    funcPageState.funcPage = 'search';
  }

  // 關鍵字搜尋輸入處裡
  const keywordInChange = (e) => {
    e = e.currentTarget;
    setKeywordIn(e.value);

    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    let words = [];
    let match;

    while((match = regex.exec(e.value)) !== null){
      words.push(match[0].replace(/"/g, ''));
    }

    words = words.filter(word => word.trim() !== '');

    setKeyword(words);
  }
  // 關鍵字搜尋
  const keywordSearch = async (e) => {
    searchFilterState.keyword = keyword;
    await search();
  }

  // 下載文章列表
  const downloadPostListClick = async (type) => {
    FSLCtrl.open('處理中...');

    const res = await electron.invoke('download-post-list', {
      searchTarget: searchResultState.searchTarget,
      isTmp: searchResultState.isTmp,
      type,
    });

    if(res){
      toast.success('下載成功');
    }

    FSLCtrl.close();
  }
  
  // 顯示全部文章
  const showAllClick = async() => {
    const postListData = await electron.invoke('get-all-post-list',{
      searchTarget: searchResultState.searchTarget,
      isTmp: searchResultState.isTmp
    });

    // 還原搜尋條件
    Object.assign(searchFilterState, {
      type: '-',
      keyword: [],
      sort: '',
    });

    searchResultState.postListData = postListData;
  }
  // 按照GP排序
  const sortGPClick = async() => {
    searchFilterState.sort = 'gp';
    await search();
  }

  // 顯示文章詳細內容
  const FShowCilck = async (i) => {
    FShowState.postData = {};
    await delay(10);
    FShowState.isOpen = true;
    FShowState.postData = srSnap.postListData[i];
  }

  return(<div className="result-page">
    <div className="t1">
        <div className="t1-1">
          <button className='func btn back' onClick={backClick}><i className='bx bxs-reply'></i></button>

          <Link className='func btn st' href={srSnap.targetUrl}>{srSnap.searchTarget}</Link>

          <label className="func si">
            <input
              type="text" placeholder="關鍵字搜尋(Enter 進行搜尋)"
              value={KeywordIn} onChange={keywordInChange}
              onKeyDown={(event) => { event.key === 'Enter' && keywordSearch() }}
            />
            {keyword.length > 0 && <div className="keyword-list">
              {keyword.map((word, index) => (
                <span key={index} className="keyword">{word}</span>
              ))}
            </div>}
          </label>

          <div className='func btn download' onClick={() => setShowDlTypeList(!showDlTypeList)}>
            <i className='bxr  bx-arrow-in-down-square-half'></i>
            <div className={clsx("download-type-list-box", !showDlTypeList && "hide")}>
              <div className="download-type-list">
                <button
                  className="dl-type btn-df" 
                  style={{'--c': 'rgb(180, 73, 223)'}}
                  onClick={() => downloadPostListClick('JSON')}
                >
                  <i className='bxr  bx-bracket-curly'></i> JSON
                </button>

                <button
                  className="dl-type btn-df"
                  style={{'--c': 'rgb(4, 131, 0)'}}
                  onClick={() => downloadPostListClick('CSV')}
                >
                  <i className='bxr  bx-table-list'  ></i> CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="t1-1">
          <button className='func btn' onClick={showAllClick}>顯示全部</button>
          <button className='func btn' onClick={sortGPClick}>GP 排序</button>
        </div>
    </div>

    <div className="t2">
      <div className="post-list-box">
        <div className="post-count">已顯示 {srSnap.postListData.length} 篇文章</div>
        <div className="post-list">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height} width={width} rowHeight={70}
                rowCount={srSnap.postListData.length}
                rowRenderer={({ index, key, style }) => {
                  const postData = srSnap.postListData[index];

                  return(<button key={key}
                    style={style} className="post-data-box"
                    onClick={() => FShowCilck(index)}
                  >
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
      <TypeRank srSnap={srSnap} />
      <PostInfo srSnap={srSnap} />
    </div>

    <FShow />
  </div>)
}