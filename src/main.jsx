import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import AppRoot from './App';
import './index.css';

async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;
  try { await StatusBar.setStyle({ style: Style.Dark }); await StatusBar.setBackgroundColor({ color: '#0f0f13' }); } catch {}
  try { await Keyboard.setAccessoryBarVisible({ isVisible: false }); } catch {}
}

initCapacitor().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode><AppRoot /></React.StrictMode>
  );
});
