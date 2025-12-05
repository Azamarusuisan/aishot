# Site Screenshot Crawler

URLを指定してサイト内のページを自動的にクロールし、各ページのフルページスクリーンショットをPNG形式で保存するツールです。CLIとWeb UIの両方で使えます。

## 概要

- 指定したURLを起点に、同一ホスト内のページを幅優先探索でクロール
- 各ページのフルページスクリーンショットを自動撮影
- PC版（1440x900）のビューポートで撮影
- 並列処理による効率的なスクリーンショット取得

## 必要環境

- Node.js 18.0.0 以上
- npm

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# Playwrightブラウザのインストール（Chromium）
npx playwright install chromium
```

## 使い方

### Web UI（推奨）

```bash
npm run server
```

ブラウザで http://localhost:3000 を開き、URLを貼り付けて「スクショ開始」ボタンを押すだけ。

### CLI

```bash
node src/index.js https://example.com
```

### オプション付き実行

```bash
node src/index.js https://example.com --max-pages=50 --max-depth=3 --out=./screenshots --concurrency=3
```

### オプション一覧

| オプション | 説明 | デフォルト値 |
|-----------|------|-------------|
| `--max-pages` | クロールする最大ページ数 | 30 |
| `--max-depth` | クロールの最大深さ（起点URLを深さ0とする） | 2 |
| `--out` | スクリーンショット保存先ディレクトリ | ./screenshots |
| `--concurrency` | 同時スクリーンショット撮影数 | 3 |
| `--user-agent` | リクエスト時のUser-Agent文字列 | Chrome 120のUA |

### ヘルプの表示

```bash
node src/index.js --help
```

## 出力ディレクトリ構造

```
screenshots/
  example.com/
    pc/
      index.png
      about.png
      service-list.png
      blog-post-id-123.png
```

## 除外されるリンク

以下のリンクはクロール対象から自動的に除外されます：

- `mailto:`, `tel:`, `javascript:` で始まるリンク
- 画像ファイル（.jpg, .jpeg, .png, .gif, .webp, .svg）
- ドキュメントファイル（.pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx）
- アーカイブファイル（.zip, .tar, .gz, .rar, .7z）
- 管理画面系URL（/logout, /admin, /wp-admin, /dashboard を含むパス）

## 注意事項

### 利用規約・法的配慮

- **対象サイトの利用規約を必ず確認してください。** スクレイピングやクロールを禁止しているサイトでの使用は控えてください。
- 取得したスクリーンショットの利用は、著作権法およびサイトの利用規約に従ってください。

### サーバー負荷への配慮

- 本ツールはリクエスト間に自動的にウェイト（約300ms）を入れていますが、大量のページをクロールする場合はサーバーに負荷がかかる可能性があります。
- `--max-pages` と `--concurrency` の値は適切に設定してください。
- 対象サイトのサーバー状況に配慮し、必要に応じてクロール間隔を調整してください。

### robots.txt

- 現在のバージョンでは robots.txt のチェックは行っていません。
- 対象サイトの robots.txt を手動で確認し、クロールが許可されているか確認することを推奨します。

### 対応範囲

- ログインが必要なページや会員専用エリアには対応していません。
- フォーム送信や複雑なUI操作は行いません。
- 無限スクロールへの完全対応は行っていません。

## ライセンス

MIT
