import { Message } from 'discord.js';
import { logger } from '../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../utils/permissionChecker';

/**
 * レガシーコマンド: !moveall <channelId>
 * 全てのボイスチャンネルからメンバーを指定のチャンネルに移動させます
 */
export async function handleMoveAll(message: Message, args: string[]) {
  // 権限チェック
  if (!hasAdminPermissions(message.member)) {
    await message.reply('⚠️ このコマンドを実行するには管理者権限が必要です。');
    return;
  }

  const permissionCheck = checkBotPermissions(message.guild);
  if (!permissionCheck.hasPermissions) {
    await message.reply(`⚠️ Botに必要な権限がありません。不足している権限: ${permissionCheck.missingPermissions.join(', ')}`);
    return;
  }

  // 引数チェック
  if (args.length < 1) {
    await message.reply('⚠️ 使用方法: !moveall <channelId>');
    return;
  }

  const targetChannelId = args[0];

  try {
    // 移動先チャンネルの取得
    const targetChannel = message.guild?.channels.cache.get(targetChannelId);
    
    if (!targetChannel || targetChannel.type !== 2) { // 2 = GuildVoice
      await message.reply('⚠️ 指定されたチャンネルが存在しないか、ボイスチャンネルではありません。');
      return;
    }

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // 全てのボイスチャンネルを取得
    const voiceChannels = message.guild?.channels.cache.filter(
      channel => channel.type === 2 && channel.id !== targetChannelId
    );

    if (!voiceChannels || voiceChannels.size === 0) {
      await message.reply('⚠️ 移動元となるボイスチャンネルが見つかりません。');
      return;
    }

    // 処理中メッセージ
    const processingMsg = await message.reply('🔄 メンバーを移動しています...');

    // 各チャンネルのメンバーを移動
    for (const [_, channel] of voiceChannels) {
      // チャンネル内のメンバーを取得
      const voiceChannel = channel as any; // VoiceChannel
      
      for (const [memberId, member] of voiceChannel.members) {
        try {
          // メンバーを移動
          await member.voice.setChannel(targetChannel.id);
          
          // ログ記録
          logger.logVoiceMovement(
            `メンバー ${member.user.tag} を ${voiceChannel.name} から ${targetChannel.name} に移動しました`
          );
          
          movedCount++;
          
          // API制限を避けるための遅延
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          logger.error(`メンバー ${member.user.tag} の移動に失敗しました:`, error);
          failedCount++;
        }
      }
    }

    // 結果を返信
    if (movedCount > 0) {
      await processingMsg.edit(
        `✅ ${movedCount}人のメンバーを ${targetChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await processingMsg.edit('⚠️ 移動するメンバーが見つかりませんでした。');
    }
  } catch (error) {
    logger.error('moveAll コマンドの実行中にエラーが発生しました:', error);
    await message.reply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}
