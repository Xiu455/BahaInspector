import { proxy } from 'valtio'

export const loaddingState = proxy({
  isloadding: true,
  message: ''
})

export const funcPageState = proxy({
  funcPage: 'search'
});

export const configState = proxy({
  BAHARUNE: '',
  ConcurrencyCount: 5,
  ConcurrencyDelay: 1000,
})