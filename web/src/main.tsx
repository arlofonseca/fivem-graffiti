import { NextUIProvider } from '@nextui-org/system';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NextUIProvider className="dark">
      <App />
    </NextUIProvider>
  </React.StrictMode>
);
