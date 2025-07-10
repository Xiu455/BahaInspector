import { useState, useEffect, useRef } from "react";

import './style.scss'

const WanderingBox = ({ children, interval = 2500 }) => {
  const walkerRef = useRef(null);

  const moveRandomly = () => {
    const el = walkerRef.current;
    if (!el) return;
  
    // 取得視窗寬高
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = el.getBoundingClientRect();
  
    // 限制移動範圍
    const maxLeft = viewportWidth - rect.width;
    const maxTop = viewportHeight - rect.height;
  
    // 隨機篇移量
    const dx = (Math.random() * 0.19 + 0.01) * viewportWidth;
    const dy = (Math.random() * 0.19 + 0.01) * viewportHeight;
  
    // 隨機方向
    const directionX = Math.random() < 0.5 ? -1 : 1;
    const directionY = Math.random() < 0.5 ? -1 : 1;

    let newLeft = rect.left + dx * directionX;
    let newTop = rect.top + dy * directionY;
  
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));
  
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
  };

  useEffect(() => {
    walkerRef.current.style.left = `${20 + Math.random() * 60}%`;
    walkerRef.current.style.top = `${20 + Math.random() * 60}%`;
    walkerRef.current.style.display = 'flex';
  },[])

  useEffect(() => {
    const intervalId = setInterval(moveRandomly, interval);
    return () => clearInterval(intervalId);
  }, [interval]);

  return (
    <div
      className="floating-walker"
      ref={walkerRef}
      onMouseEnter={() => setOpacity(0.5)}
      onMouseLeave={() => setOpacity(1)}
    >
      {children}
    </div>
  );
};


export default WanderingBox;