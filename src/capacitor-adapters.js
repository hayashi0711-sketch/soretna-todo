/**
 * Capacitor adapter layer.
 * Wraps Capacitor plugins with graceful Web fallbacks so the same code
 * works in the browser (Netlify) AND in native Android/iOS builds.
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

// ── Storage (Capacitor Preferences → localStorage fallback) ──────────────────
let _Preferences = null;
async function getPreferences() {
  if (_Preferences) return _Preferences;
  if (isNative()) {
    const m = await import('@capacitor/preferences');
    _Preferences = m.Preferences;
  }
  return _Preferences;
}

export const storage = {
  async get(key, fallback = null) {
    try {
      const p = await getPreferences();
      if (p) {
        const { value } = await p.get({ key });
        return value ? JSON.parse(value) : fallback;
      }
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  async set(key, value) {
    try {
      const p = await getPreferences();
      const str = JSON.stringify(value);
      if (p) { await p.set({ key, value: str }); return; }
      localStorage.setItem(key, str);
    } catch {}
  },
};

// ── Haptics ──────────────────────────────────────────────────────────────────
let _Haptics = null, _ImpactStyle = null, _NotifType = null;
async function getHaptics() {
  if (_Haptics) return { Haptics: _Haptics, ImpactStyle: _ImpactStyle, NotificationType: _NotifType };
  if (isNative()) {
    const m = await import('@capacitor/haptics');
    _Haptics = m.Haptics; _ImpactStyle = m.ImpactStyle; _NotifType = m.NotificationType;
  }
  return { Haptics: _Haptics, ImpactStyle: _ImpactStyle, NotificationType: _NotifType };
}

export const haptics = {
  async light()   { try { const { Haptics, ImpactStyle } = await getHaptics(); await Haptics?.impact({ style: ImpactStyle?.Light }); } catch {} },
  async medium()  { try { const { Haptics, ImpactStyle } = await getHaptics(); await Haptics?.impact({ style: ImpactStyle?.Medium }); } catch {} },
  async success() { try { const { Haptics, NotificationType } = await getHaptics(); await Haptics?.notification({ type: NotificationType?.Success }); } catch {} },
};

// ── Local Notifications ───────────────────────────────────────────────────────
let _LN = null, _notifPermitted = false;

export async function requestNotificationPermission() {
  if (!isNative()) return; // browser notifications not needed (in-app only)
  try {
    const m = await import('@capacitor/local-notifications');
    _LN = m.LocalNotifications;
    const { display } = await _LN.requestPermissions();
    _notifPermitted = display === 'granted';
  } catch {}
}

export async function scheduleDeadlineNotification(todo, minutesBefore = 30) {
  if (!_LN || !_notifPermitted || !todo.deadline) return;
  const fireAt = new Date(new Date(todo.deadline).getTime() - minutesBefore * 60_000);
  if (fireAt <= new Date()) return;
  try {
    await _LN.schedule({ notifications: [{
      id: todo.id,
      title: '⏰ それな！Todo',
      body: `「${todo.text}」の締め切りまで${minutesBefore}分です`,
      schedule: { at: fireAt },
      smallIcon: 'ic_stat_icon_config_sample',
    }] });
  } catch {}
}

export async function cancelNotification(id) {
  try { await _LN?.cancel({ notifications: [{ id }] }); } catch {}
}

// ── Speech Recognition ────────────────────────────────────────────────────────
export async function requestSpeechPermission() {
  return true; // Web Speech API requires no explicit permission request
}

export function startListening({ onResult, onInterim, onEnd, onError }) {
  return startWebSpeech({ onResult, onInterim, onEnd, onError });
}

function startWebSpeech({ onResult, onInterim, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError?.('unsupported'); onEnd?.(); return () => {}; }
  const r = new SR();
  r.lang = 'ja-JP';
  r.continuous = true;
  r.interimResults = true;
  // Android Chrome が同一 final 結果を複数回発火することがあるため処理済みインデックスを追跡
  let lastFinalIndex = -1;
  r.onresult = e => {
    let final = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        if (i > lastFinalIndex) {
          final += e.results[i][0].transcript;
          lastFinalIndex = i;
        }
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    if (final) onResult?.(final);
    if (interim) onInterim?.(interim);
  };
  r.onerror = e => { onError?.(e.error || e); };
  r.onend   = () => onEnd?.();
  r.start();
  return () => { try { r.abort(); } catch {} };
}

// ── Keyboard (native only) ────────────────────────────────────────────────────
export async function addKeyboardListeners(onShow, onHide) {
  if (!isNative()) return () => {};
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    const s = await Keyboard.addListener('keyboardWillShow', i => onShow(i.keyboardHeight));
    const h = await Keyboard.addListener('keyboardWillHide', () => onHide());
    return () => { s?.remove?.(); h?.remove?.(); };
  } catch { return () => {}; }
}

// ── Back button (Android) ─────────────────────────────────────────────────────
export async function addBackButtonListener(cb) {
  if (!isNative()) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    const h = await App.addListener('backButton', cb);
    return () => h?.remove?.();
  } catch { return () => {}; }
}
