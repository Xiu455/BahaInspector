import { proxy } from 'valtio'

// loadding狀態
export const loaddingState = proxy({
  isloadding: false,
  message: ''
})

// 功能頁面狀態
export const funcPageState = proxy({
  funcPage: 'search',
  searchBtn: 'search',
});

// 設定狀態
export const configState = proxy({
  BAHARUNE: '',
  ConcurrencyCount: 5,
  ConcurrencyDelay: 1000,
});

// 搜尋結果狀態
export const searchResultState = proxy({
  searchTarget: '',
  targetUrl: '',
  postListData: [],
  typeNum: {}, 
});