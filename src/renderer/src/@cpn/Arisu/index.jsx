import WanderingBox from '../WanderingBox'

import './style.scss'

export default function Arisu(){
  return (<WanderingBox>
    <img src="img/Arisu.webp" className='arisu' draggable={false} />
  </WanderingBox>)
}