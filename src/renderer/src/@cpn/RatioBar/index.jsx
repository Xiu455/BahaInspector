import clsx from 'clsx'

import './style.scss'

export default function RatioBar(props){
  const {
    className,
    id,
    ratio,
    bgc,
    children,
  } = props;

  return(<div
    id={id}
    className={clsx('ratio-bar', className)}
    style={{
      '--ratio': ratio,
      '--bg-c': bgc,
    }}
  >{children}</div>)
}