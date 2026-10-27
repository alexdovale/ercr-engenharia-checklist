import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with automatic updates and offline caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nova versão do ERCR Checklist disponível.');
  },
  onOfflineReady() {
    console.log('Aplicativo pronto para funcionamento 100% offline.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
