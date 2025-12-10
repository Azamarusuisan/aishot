# Playwright公式イメージを使用（Chromiumが含まれている）
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール（postinstallのplaywrightインストールはスキップ）
RUN npm ci --ignore-scripts

# アプリケーションコードをコピー
COPY . .

# 出力ディレクトリを作成
RUN mkdir -p screenshots

# ポートを公開
EXPOSE 3000

# 環境変数
ENV NODE_ENV=production
ENV PORT=3000

# アプリケーションを起動
CMD ["node", "src/server.js"]
