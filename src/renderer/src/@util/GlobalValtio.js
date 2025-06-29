import { proxy } from 'valtio'

export const loaddingState = proxy({
  isloadding: true,
  message: ''
})

export const funcPageState = proxy({
  funcPage: 'home'
});