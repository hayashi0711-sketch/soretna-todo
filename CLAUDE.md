# それな！Todo — プロジェクト概要

## 技術スタック
- **フレームワーク**: React 18 + Vite 5
- **モバイル**: Capacitor 6（Android / iOS）
- **スタイル**: インラインスタイル（CSS-in-JS）
- **状態管理**: React useState / useRef / useCallback
- **データ永続化**: Capacitor Preferences（Web: localStorage フォールバック）

## ディレクトリ構成
```
src/
  App.jsx                # メインUI・全ロジック（約1200行）
  capacitor-adapters.js  # Capacitorプラグイン + Webフォールバック
  main.jsx               # エントリーポイント（Capacitor初期化）
  index.css              # グローバルスタイル（最小限）
index.html
vite.config.js
capacitor.config.ts
netlify.toml             # Netlify デプロイ設定
```

## 主な機能
- タスク追加・編集・削除・完了
- タグ管理（カスタムカラー付き）
- 優先度（高/中/低/なし）
- 締め切り日時・通知
- カレンダービュー
- 音声入力（マイク）
- 6種類のテーマ切り替え（ダーク/ネイビー/フォレスト/ローズ/ライト/サンド）
- 猫アシスタントUI

## ビルド・開発コマンド
```bash
npm install        # 依存関係インストール
npm run dev        # 開発サーバー起動（localhost:5173）
npm run build      # dist/ に本番ビルド
npm run preview    # ビルド結果のプレビュー
```

## Netlify デプロイ
- GitHubリポジトリと連携してプッシュ時に自動デプロイ
- ビルドコマンド: `npm run build`
- 公開ディレクトリ: `dist`

## Web向け注意点
- `capacitor-adapters.js` がネイティブ/Web を自動判定
- Web環境では localStorage、通知はブラウザ Notification API を使用
- 音声認識は Web Speech API にフォールバック

## コーディング規約
- コンポーネントは App.jsx 内にまとめて定義（現状）
- テーマは `THEMES` 配列で管理、新テーマ追加時はここに追記
- アイコンはインライン SVG コンポーネント
