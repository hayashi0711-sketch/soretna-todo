# それな！Todo — Capacitor v3 (Android / iOS)

## 📁 ファイル構成

```
todo-app/
├── src/
│   ├── main.jsx                 # エントリー（Capacitor初期化）
│   ├── App.jsx                  # メインUI（全機能）
│   ├── capacitor-adapters.js    # Capacitorプラグイン + Webフォールバック
│   └── index.css
├── index.html
├── vite.config.js
├── capacitor.config.ts          # ← appId を変更すること
└── package.json
```

## 🆕 v3 の変更点
- テーマ切り替え（6種類）
- 猫アシスタントをタップで閉じる
- カレンダー自動スクロール＋時間確認表示
- アプリ名「それな！Todo」

## 🚀 セットアップ

```bash
npm install
npm run build          # dist/ 生成

# Android
npm run cap:add:android
npm run cap:sync
npm run cap:open:android

# iOS (Mac限定)
npm run cap:add:ios
npm run cap:sync
npm run cap:open:ios
```

## 📋 AndroidManifest.xml に追記

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## 📋 iOS Info.plist に追記

```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>音声でタスクを入力するために使用します</string>
<key>NSMicrophoneUsageDescription</key>
<string>音声入力のためにマイクを使用します</string>
```
// Force rebuild
// Rebuild trigger Wed May 20 01:43:07     2026
