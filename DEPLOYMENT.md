# Discord Voice Mover Bot - デプロイメントガイド

このガイドでは、Discord Voice Mover Botを様々な環境にデプロイする方法について説明します。

## 前提条件

- Node.js 16.9.0以上がインストールされていること
- npmがインストールされていること
- Discordアプリケーションが作成され、Botトークンが取得済みであること
- Botに「Move Members」権限が付与されていること

## ローカル環境でのデプロイ（開発・テスト用）

1. リポジトリをクローンまたはダウンロードします
2. 依存関係をインストールします
   ```bash
   npm install
   ```
3. `.env`ファイルを作成し、必要な環境変数を設定します
   ```
   BOT_TOKEN=your_bot_token_here
   GUILD_ID=your_guild_id_here
   LOG_CHANNEL_ID=your_log_channel_id_here (optional)
   PREFIX=! (optional, defaults to !)
   ```
4. TypeScriptをコンパイルします
   ```bash
   npm run build
   ```
5. コマンドを登録します
   ```bash
   npm run deploy
   ```
6. Botを起動します
   ```bash
   npm start
   ```

## Railway.appへのデプロイ（推奨）

Railway.appは、Node.jsアプリケーションのデプロイに最適なプラットフォームです。

1. [Railway.app](https://railway.app/)にアカウントを作成します
2. 新しいプロジェクトを作成し、GitHubリポジトリと連携します
3. 環境変数を設定します（BOT_TOKEN, GUILD_ID, LOG_CHANNEL_ID, PREFIX）
4. デプロイ設定で以下のコマンドを設定します
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. デプロイを開始します

Railway.appの無料枠は月に5ドル相当のクレジットがあり、小規模なBotの運用には十分です。

## Render.comへのデプロイ

Render.comもNode.jsアプリケーションのデプロイに適したプラットフォームです。

1. [Render.com](https://render.com/)にアカウントを作成します
2. 新しいWeb Serviceを作成し、GitHubリポジトリと連携します
3. 以下の設定を行います
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. 環境変数を設定します（BOT_TOKEN, GUILD_ID, LOG_CHANNEL_ID, PREFIX）
5. デプロイを開始します

Render.comの無料枠は月に750時間の実行時間があり、1つのサービスを常時稼働させるのに十分です。

## VPSへのデプロイ（DigitalOcean, AWS, GCP）

より高度なカスタマイズが必要な場合は、VPSを利用することができます。

1. VPSを準備し、SSHでアクセスします
2. Node.jsとnpmをインストールします
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. リポジトリをクローンします
   ```bash
   git clone https://github.com/yourusername/discord-voice-mover-bot.git
   cd discord-voice-mover-bot
   ```
4. 依存関係をインストールします
   ```bash
   npm install
   ```
5. `.env`ファイルを作成し、環境変数を設定します
6. TypeScriptをコンパイルします
   ```bash
   npm run build
   ```
7. コマンドを登録します
   ```bash
   npm run deploy
   ```
8. PM2を使用してBotをバックグラウンドで実行します
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name discord-voice-mover-bot
   pm2 save
   pm2 startup
   ```

## Dockerを使用したデプロイ

Dockerを使用することで、環境に依存しないデプロイが可能になります。

1. Dockerfileを作成します
   ```dockerfile
   FROM node:16-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   RUN npm run build
   
   CMD ["npm", "start"]
   ```
2. イメージをビルドします
   ```bash
   docker build -t discord-voice-mover-bot .
   ```
3. コンテナを実行します
   ```bash
   docker run -d --name discord-bot --restart unless-stopped --env-file .env discord-voice-mover-bot
   ```

## トラブルシューティング

### Botが起動しない
- `.env`ファイルが正しく設定されているか確認してください
- BOT_TOKENが有効であるか確認してください
- Node.jsのバージョンが16.9.0以上であるか確認してください

### コマンドが登録されない
- GUILD_IDが正しく設定されているか確認してください
- Botに必要な権限（applications.commands）が付与されているか確認してください
- `npm run deploy`コマンドが正常に実行されたか確認してください

### メンバーの移動に失敗する
- Botに「Move Members」権限が付与されているか確認してください
- Botのロールが移動対象のメンバーよりも上位にあるか確認してください
- ログチャンネルを設定している場合は、エラーメッセージを確認してください

## 定期的なメンテナンス

- 定期的にBotを再起動することで、メモリリークなどの問題を防ぐことができます
- Discord.jsやNode.jsのアップデートに合わせて、Botも更新することをお勧めします
- ログを定期的に確認し、エラーや問題が発生していないか監視してください
