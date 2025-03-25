import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('undolastmove')
  .setDescription('最後の移動操作を元に戻します')
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers | PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // 権限チェック
  if (!hasAdminPermissions(interaction.member)) {
    await interaction.reply({ content: '⚠️ このコマンドを実行するには管理者権限が必要です。', ephemeral: true });
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

  // 最後の移動操作を取得
  const lastMoveRecords = moveHistory.getLastSessionRecords();
  if (!lastMoveRecords || lastMoveRecords.length === 0) {
    await interaction.reply({ 
      content: '⚠️ 元に戻せる移動操作が見つかりません。',
      ephemeral: true 
    });
    return;
  }

  try {
    await interaction.deferReply();

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // 各メンバーを元のチャンネルに戻す
    for (const record of lastMoveRecords) {
      try {
        // メンバーを取得
        const member = await interaction.guild?.members.fetch(record.userId);
        
        // 現在のメンバーが移動先チャンネルにいるかチェック
        if (!member || member.voice.channelId !== record.targetChannelId) {
          logger.warn(`メンバー ${record.username} は移動先チャンネルにいないため、元に戻せません`);
          failedCount++;
          continue;
        }

        // メンバーを元のチャンネルに戻す
        await member.voice.setChannel(record.sourceChannelId);
        
        // ログ記録
        logger.logVoiceMovement(
          `メンバー ${record.username} を ${record.targetChannelName} から元の ${record.sourceChannelName} に戻しました`
        );
        
        movedCount++;
        
        // API制限を避けるための遅延
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`メンバー ${record.username} の元に戻す操作に失敗しました:`, error);
        failedCount++;
      }
    }

    // 移動履歴をクリア
    moveHistory.clearLastSession();

    // 結果を返信
    if (movedCount > 0) {
      await interaction.editReply(
        `✅ ${movedCount}人のメンバーを元のチャンネルに戻しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の元に戻す操作に失敗しました。` : '')
      );
    } else {
      await interaction.editReply('⚠️ メンバーを元に戻す操作に失敗しました。');
    }
  } catch (error) {
    logger.error('undolastmove コマンドの実行中にエラーが発生しました:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
    } else {
      await interaction.reply({ 
        content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
        ephemeral: true 
      });
    }
  }
}
