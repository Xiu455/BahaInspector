import clsx from 'clsx'
import './style.scss'

export default function BtnS1(props){
  const {
    className,
    children,
    ...rest
  } = props

  return(<button
    className={clsx('btn-style-1', className)}
    {...rest}
  >
    <div className="text"><span>{children}</span></div>
  </button>)
}