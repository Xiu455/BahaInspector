const electron = window['electron'];  // 獲得後端溝通API

export default function Link({ href, children, ...props }){
  const handleClick = (e) => {
    if (href && href.startsWith('http')) {
      e.preventDefault();
      electron.openURL(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}