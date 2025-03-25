# Discord Voice Mover Bot

Discord Voice Mover Botは、ボイスチャンネルのメンバー移動を効率化するためのDiscordボットです。サーバー管理者やイベント運営者の作業を大幅に簡略化します。

## 主な機能

### 基本機能
- **全メンバー移動** - すべてのボイスチャンネルからメンバーを一括で指定のチャンネルに移動
- **特定チャンネルからの移動** - 特定のボイスチャンネルからメンバーを別のチャンネルに移動
- **特定ロール移動** - 特定のロールを持つメンバーのみを指定のチャンネルに移動

### 拡張機能
- **チャンネル名指定機能** - IDではなくチャンネル名で移動先を指定可能
- **移動操作の取り消し機能** - 最後の移動操作を元に戻す
- **人数監視・分散機能** - チャンネルの人数が一定数を超えた場合に自動で分散
- **AFK移動機能** - 一定時間無操作のメンバーを自動でAFKチャンネルに移動

## コマンド一覧

### スラッシュコマンド
- `/moveall [channel]` - すべてのボイスチャンネルからメンバーを指定のチャンネルに移動
- `/movefrom [from] [to]` - 特定のボイスチャンネルからメンバーを別のチャンネルに移動
- `/moverole [role] [channel]` - 特定のロールを持つメンバーを指定のチャンネルに移動
- `/movebyname [channelname]` - チャンネル名で指定したチャンネルにメンバーを移動
- `/undolastmove` - 最後の移動操作を元に戻す

### パターン管理コマンド
- `/savepattern [name] [from] [to]` - よく使う移動パターンを保存
- `/loadpattern [name]` - 保存した移動パターンを実行
- `/listpatterns` - 保存されている移動パターンの一覧を表示
- `/deletepattern [name]` - 保存された移動パターンを削除

### 情報コマンド
- `/help [command]` - コマンドの使い方を表示
- `/status` - ボットのステータスを表示

### テキストコマンド（レガシー）
- `!moveall [channelId]` - すべてのボイスチャンネルからメンバーを指定のチャンネルに移動
- `!movefrom [sourceChannelId] [targetChannelId]` - 特定のボイスチャンネルからメンバーを別のチャンネルに移動
- `!moverole [roleId] [channelId]` - 特定のロールを持つメンバーを指定のチャンネルに移動

## セットアップ方法

### 前提条件
- Node.js 16.9.0以上
- npm
- Discordアカウントとボットの作成権限

### インストール手順
1. このリポジトリをクローンまたはダウンロードします
   ```bash
   git clone https://github.com/yourusername/discord-voice-mover-bot.git
   cd discord-voice-mover-bot
   ```

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

6. ボットを起動します
   ```bash
   npm start
   ```

### Botの招待方法
1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーションを選択
2. 「OAuth2」→「URL Generator」を選択
3. 以下のスコープとボット権限を選択:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Move Members`, `Send Messages`, `Read Message History`, `View Channels`
4. 生成されたURLを使用してボットをサーバーに招待

## 設定オプション

`.env`ファイルで以下の設定が可能です:

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| BOT_TOKEN | Discordボットトークン | 必須 |
| GUILD_ID | 開発用サーバーID | 必須（開発時のみ） |
| LOG_CHANNEL_ID | ログを送信するテキストチャンネルID | なし |
| PREFIX | レガシーコマンドのプレフィックス | ! |

## 自動機能の設定

`src/events/voiceStateMonitor.ts`ファイルで以下の設定が可能です:

```typescript
// チャンネルごとの最大人数設定
const MAX_MEMBERS_PER_CHANNEL = 5;

// AFK設定
const AFK_TIMEOUT_MINUTES = 15; // 無操作と判断する時間（分）
```

これらの値を変更することで、自動分散機能とAFK移動機能の動作を調整できます。

## デプロイ方法

詳細なデプロイ方法については、[DEPLOYMENT.md](DEPLOYMENT.md)を参照してください。

## トラブルシューティング

### 一般的な問題
- **ボットが応答しない**: ボットのオンライン状態とトークンの有効性を確認してください
- **コマンドが登録されない**: `npm run deploy`コマンドが正常に実行されたか確認してください
- **メンバーの移動に失敗する**: ボットに「Move Members」権限が付与されているか確認してください

### ログの確認
ボットは実行中にログを出力します。問題が発生した場合は、これらのログを確認することで原因を特定できる場合があります。

## メンテナンスガイドライン

### 定期的なメンテナンス
- 週に1回程度ボットを再起動することで、メモリリークなどの問題を防ぐことができます
- Discord.jsやNode.jsのアップデートに合わせて、ボットも更新することをお勧めします

### アップデート方法
1. 最新のコードを取得します
   ```bash
   git pull
   ```
2. 依存関係を更新します
   ```bash
   npm install
   ```
3. TypeScriptをコンパイルします
   ```bash
   npm run build
   ```
4. ボットを再起動します
   ```bash
   npm start
   ```

### バックアップ
定期的に`.env`ファイルのバックアップを取ることをお勧めします。これにより、ボットの設定が失われた場合でも復元が容易になります。

## 貢献方法

1. このリポジトリをフォークします
2. 新しいブランチを作成します (`git checkout -b feature/amazing-feature`)
3. 変更をコミットします (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュします (`git push origin feature/amazing-feature`)
5. プルリクエストを作成します

## ライセンス

このプロジェクトはISCライセンスの下で公開されています。詳細については[LICENSE](LICENSE)ファイルを参照してください。

## 謝辞

- [Discord.js](https://discord.js.org/) - Discordボット開発のためのNode.jsライブラリ
- [TypeScript](https://www.typescriptlang.org/) - JavaScriptの型付きスーパーセット
