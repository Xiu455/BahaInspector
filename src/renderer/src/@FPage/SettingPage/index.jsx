import { useState, useEffect } from 'react'
import { snapshot } from 'valtio'
import { toast } from 'react-toastify'
import clsx from 'clsx'
import _ from 'lodash'

import { configState } from '../../@util/GlobalValtio'

import { FSL, FSLCtrl } from '../../@cpn/FSL';
import BtnS1 from '../../@cpn/Button/S1';

import './style.scss';

const electron = window['electron'];

const boundsCheck = {
  ConcurrencyCount: (number) => {
    if(isNaN(number)) return 5;
    // 1 ~ 50
    number = (number < 1)? 1 : number;
    number = (number > 50)? 50 : number;
    return number;
  },
  ConcurrencyDelay: (number) => {
    if(isNaN(number)) return 1000;
    // 10 ~10000
    number = (number < 10)? 10 : number;
    number = (number > 10000)? 10000 : number;
    return number;
  }
};

const Input = (props) => {
  const {
    width,
    prompt,
    id,
    className,
    ...rest
  } = props;

  return(<div
    id={id}
    className={clsx('input', className)}
    style={{width: `${width}`}}
  >
    <span className="prompt">{prompt}</span>
    <input {...rest} />
  </div>)
}

export default function SettingPage(){
  const configObj = snapshot(configState);

  const [ config, setConfig ] = useState(configObj);
  const [ isChange, setIsChange ] = useState(false);

  // 處理輸入值
  const handleConfigChange = (e) => {
    let { name, value, type } = e.target;

    if(type === 'number'){
      // 僅允許正整數字輸入
      if(isNaN(value) || value < 0 || value == '-'){
        return;
      }

      if(name === 'ConcurrencyCount' && value > 50){
        value = 50;
      }
      if(name === 'ConcurrencyDelay' && value > 10000){
        value = 10000;
      }

      value = (value >= 0)? parseInt(value) : '';
    }

    setConfig(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 處理失焦事件
  const handleBlur = (e) => {
    let { name, value, type } = e.target;

    if(type === 'number'){
      if(value === '' || value === '0'){
        value = (name === 'ConcurrencyCount') ? 5 : 
                (name === 'ConcurrencyDelay')? 1000 : value;
      }

      value = parseInt(boundsCheck[name](value));

      setConfig(prev => ({...prev, [name]: value }));
    }
  }

  // 保存設定
  const saveConfigClick = async () => {
    FSLCtrl.open('儲存中...');

    await electron.invoke('save-config', config);

    Object.assign(configState, config);

    setIsChange(false);
    FSLCtrl.close();
  }

  // 還原預設值
  const resetConfigClick = () => {
    setConfig({
      BAHARUNE: '',
      ConcurrencyCount: 5,
      ConcurrencyDelay: 1000,
    });
  }

  // 檢查Token是否有效
  const checkTokenClick = async () => {
    FSLCtrl.open('檢查BAHARUNE Token中...');
    const tokenStatus = await electron.invoke('check-token', { token: config.BAHARUNE });
    if(tokenStatus){
      toast.success('Token 有效', {toastId: 'token-success'});
    }else{
      toast.warn('Token 無效', {toastId: 'token-fail'});
    }
    FSLCtrl.close();
  }

  useEffect(() => {
    const configObj = snapshot(configState);
    setIsChange(!_.isEqual(config, configObj));
  }, [config]);

  return(<div className='setting-page'>
    <div className="config-input-area">
      <Input
        width="100%"
        prompt="BAHARUNE Token"
        name="BAHARUNE"
        value={config.BAHARUNE}
        onChange={handleConfigChange}
      />

      <Input
        width="10ch"
        prompt="請求併發數"
        name="ConcurrencyCount"
        type="number"
        value={config.ConcurrencyCount}
        onChange={handleConfigChange}
        onBlur={handleBlur}
      />

      <Input
        width="15ch"
        prompt="併發延遲(ms)"
        name="ConcurrencyDelay"
        type="number"
        value={config.ConcurrencyDelay}
        onChange={handleConfigChange}
        onBlur={handleBlur}
      />
    </div>

    <div className="func-area">
      <BtnS1
        className={clsx('save-btn',isChange && 'isChange')}
        disabled={!isChange}
        onClick={saveConfigClick}
      >儲存</BtnS1>

      <BtnS1
        onClick={resetConfigClick}
      >還原預設值</BtnS1>

      <BtnS1
        onClick={checkTokenClick}
      >驗證Token</BtnS1>
    </div>
  </div>)
}