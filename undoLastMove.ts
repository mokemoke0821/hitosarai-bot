import { SlashCommandBuilder, CommandInteraction, VoiceChannel, ChannelType } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';

// 最後の移動操作を保存する変数
let lastMoveOperation: {
  members: { userId: string, channelId: string }[],
  guildId: string,
  timestamp: number
} | null = null;

export const data = new SlashCommandBuilder()
  .setName('undolastmove')
  .setDescription('最後の移動操作を元に戻します');

export async function execute(interaction: CommandInteraction) {
  // 権限チェック
  if (!hasAdminPermissions(interaction.member)) {
    await interaction.reply({ 
      content: '⚠️ このコマンドを実行するには管理者権限が必要です。', 
      ephemeral: true 
    });
    return;
  }

  const permissionCheck = checkBotPermissions(interaction.guild);
  if (!permissionCheck.hasPermissions) {
    await interaction.reply({ 
      content: `⚠️ Botに必要な権限がありません。不足している権限: ${permissionCheck.missingPermissions.join(', ')}`, 
      ephemeral: true 
    });
    return;
  }

  // コマンドの処理を開始
  await interaction.deferReply();

  try {
    // 最後の移動操作があるか確認
    if (!lastMoveOperation || lastMoveOperation.guildId !== interaction.guildId) {
      await interaction.editReply('⚠️ 元に戻せる移動操作がありません。');
      return;
    }

    // 最後の移動から5分以上経過している場合は警告
    const fiveMinutesInMs = 5 * 60 * 1000;
    if (Date.now() - lastMoveOperation.timestamp > fiveMinutesInMs) {
      await interaction.editReply('⚠️ 最後の移動操作から5分以上経過しています。元に戻すと予期せぬ結果になる可能性があります。');
      return;
    }

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // 各メンバーを元のチャンネルに戻す
    for (const memberData of lastMoveOperation.members) {
      try {
        const member = await interaction.guild?.members.fetch(memberData.userId);
        
        if (!member || !member.voice.channelId) {
          failedCount++;
          continue;
        }

        const targetChannel = interaction.guild?.channels.cache.get(memberData.channelId) as VoiceChannel;
        
        if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
          failedCount++;
          continue;
        }

        // 現在のチャンネル名を取得
        const currentChannel = member.voice.channel;
        if (!currentChannel) {
          failedCount++;
          continue;
        }

        // メンバーを移動
        await member.voice.setChannel(targetChannel);
        
        // ログ記録
        logger.logVoiceMovement(
          `[UNDO] メンバー ${member.user.tag} を ${currentChannel.name} から ${targetChannel.name} に戻しました`
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
      await interaction.editReply(
        `✅ ${movedCount}人のメンバーを元のチャンネルに戻しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
      
      // 操作履歴をクリア
      lastMoveOperation = null;
    } else {
      await interaction.editReply('⚠️ メンバーの移動に失敗しました。');
    }
  } catch (error) {
    logger.error('undoLastMove コマンドの実行中にエラーが発生しました:', error);
    await interaction.editReply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}

/**
 * 移動操作を記録する関数
 * @param members - 移動したメンバーの情報
 * @param guildId - サーバーID
 */
export function recordMoveOperation(members: { userId: string, channelId: string }[], guildId: string) {
  lastMoveOperation = {
    members,
    guildId,
    timestamp: Date.now()
  };
  
  logger.info(`移動操作を記録しました: ${members.length}人のメンバー, サーバーID: ${guildId}`);
}
