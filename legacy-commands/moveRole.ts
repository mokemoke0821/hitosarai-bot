import { Message } from 'discord.js';
import { logger } from '../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../utils/permissionChecker';

/**
 * レガシーコマンド: !moverole <roleId> <targetChannelId>
 * 特定のロールを持つメンバーを指定のボイスチャンネルに移動させます
 */
export async function handleMoveRole(message: Message, args: string[]) {
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
    await message.reply('⚠️ 使用方法: !moverole <roleId> <targetChannelId>');
    return;
  }

  const roleId = args[0];
  const targetChannelId = args[1];

  try {
    // ロールと移動先チャンネルを取得
    const role = message.guild?.roles.cache.get(roleId);
    const targetChannel = message.guild?.channels.cache.get(targetChannelId);
    
    if (!role) {
      await message.reply('⚠️ 指定されたロールが見つかりません。');
      return;
    }

    if (!targetChannel || targetChannel.type !== 2) { // 2 = GuildVoice
      await message.reply('⚠️ 指定されたチャンネルが存在しないか、ボイスチャンネルではありません。');
      return;
    }

    // 処理中メッセージ
    const processingMsg = await message.reply('🔄 メンバーを移動しています...');

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    let notInVoiceCount = 0;
    
    // 指定されたロールを持つメンバーを取得
    const membersWithRole = await message.guild?.members.fetch();
    const targetMembers = membersWithRole?.filter(member => 
      member.roles.cache.has(roleId) && 
      member.voice.channelId && 
      member.voice.channelId !== targetChannelId
    );

    if (!targetMembers || targetMembers.size === 0) {
      await processingMsg.edit(`⚠️ ロール「${role.name}」を持ち、ボイスチャンネルに接続しているメンバーが見つかりません。`);
      return;
    }

    // 各メンバーを移動
    for (const [_, member] of targetMembers) {
      try {
        // 現在のチャンネル名を取得
        const currentChannel = member.voice.channel;
        if (!currentChannel) {
          notInVoiceCount++;
          continue;
        }

        // メンバーを移動
        await member.voice.setChannel(targetChannelId);
        
        // ログ記録
        logger.logVoiceMovement(
          `メンバー ${member.user.tag} を ${currentChannel.name} から ${targetChannel.name} に移動しました (ロール: ${role.name})`
        );
        
        movedCount++;
        
        // API制限を避けるための遅延
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`メンバー移動に失敗しました:`, error);
        failedCount++;
      }
    }

    // 結果を返信
    if (movedCount > 0) {
      await processingMsg.edit(
        `✅ ロール「${role.name}」を持つ ${movedCount}人のメンバーを ${targetChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await processingMsg.edit(
        `⚠️ ロール「${role.name}」を持つメンバーの移動に失敗しました。` +
        (notInVoiceCount > 0 ? `\n${notInVoiceCount}人はボイスチャンネルに接続していません。` : '')
      );
    }
  } catch (error) {
    logger.error('moveRole コマンドの実行中にエラーが発生しました:', error);
    await message.reply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}
