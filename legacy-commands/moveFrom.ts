import { Message } from 'discord.js';
import { logger } from '../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../utils/permissionChecker';

/**
 * レガシーコマンド: !movefrom <sourceChannelId> <targetChannelId>
 * 特定のボイスチャンネルからメンバーを別のチャンネルに移動させます
 */
export async function handleMoveFrom(message: Message, args: string[]) {
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
  if (args.length < 2) {
    await message.reply('⚠️ 使用方法: !movefrom <sourceChannelId> <targetChannelId>');
    return;
  }

  const sourceChannelId = args[0];
  const targetChannelId = args[1];

  try {
    // 移動元と移動先のチャンネルを取得
    const sourceChannel = message.guild?.channels.cache.get(sourceChannelId);
    const targetChannel = message.guild?.channels.cache.get(targetChannelId);
    
    if (!sourceChannel || sourceChannel.type !== 2) { // 2 = GuildVoice
      await message.reply('⚠️ 指定された移動元チャンネルが存在しないか、ボイスチャンネルではありません。');
      return;
    }

    if (!targetChannel || targetChannel.type !== 2) { // 2 = GuildVoice
      await message.reply('⚠️ 指定された移動先チャンネルが存在しないか、ボイスチャンネルではありません。');
      return;
    }

    if (sourceChannelId === targetChannelId) {
      await message.reply('⚠️ 移動元と移動先のチャンネルが同じです。');
      return;
    }

    // 処理中メッセージ
    const processingMsg = await message.reply('🔄 メンバーを移動しています...');

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // チャンネル内のメンバーを取得
    const voiceChannel = sourceChannel as any; // VoiceChannel
    
    if (voiceChannel.members.size === 0) {
      await processingMsg.edit(`⚠️ ${voiceChannel.name} には移動するメンバーがいません。`);
      return;
    }

    // メンバーを移動
    for (const [memberId, member] of voiceChannel.members) {
      try {
        // メンバーを移動
        await member.voice.setChannel(targetChannelId);
        
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

    // 結果を返信
    if (movedCount > 0) {
      await processingMsg.edit(
        `✅ ${movedCount}人のメンバーを ${voiceChannel.name} から ${targetChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await processingMsg.edit('⚠️ メンバーの移動に失敗しました。');
    }
  } catch (error) {
    logger.error('moveFrom コマンドの実行中にエラーが発生しました:', error);
    await message.reply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}
