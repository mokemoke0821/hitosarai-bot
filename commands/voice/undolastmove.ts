import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('undolastmove')
  .setDescription('最後の移動操作を元に戻します')
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers); // 管理者権限なしで使用可能

export async function execute(interaction: ChatInputCommandInteraction) {
  // 管理者権限チェックを削除

  const permissionCheck = checkBotPermissions(interaction.guild);
  if (!permissionCheck.hasPermissions) {
    await interaction.reply({ 
      content: `⚠️ Botに必要な権限がありません。不足している権限: ${permissionCheck.missingPermissions.join(', ')}`,
      ephemeral: true 
    });
    return;
  }

  try {
    await interaction.deferReply();

    // 最後の移動セッションを取得
    const records = moveHistory.getLastSessionRecords();
    
    if (!records || records.length === 0) {
      await interaction.editReply('⚠️ 元に戻せる移動履歴がありません。');
      return;
    }
    
    // 移動を元に戻す
    let restoredCount = 0;
    let failedCount = 0;
    
    // 逆順で処理（最後に移動したメンバーから順に戻す）
    for (let i = records.length - 1; i >= 0; i--) {
      const record = records[i];
      
      try {
        // メンバーを取得
        const member = await interaction.guild?.members.fetch(record.userId);
        
        if (member && member.voice.channelId) {
          // メンバーを元のチャンネルに戻す
          await member.voice.setChannel(record.sourceChannelId);
          restoredCount++;
          
          // ログ記録
          logger.logVoiceMovement(
            `メンバー ${record.username} を ${record.targetChannelName} から元の ${record.sourceChannelName} に戻しました`
          );
          
          // API制限を避けるための遅延
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        logger.error(`メンバー ${record.username} の元に戻す操作に失敗しました:`, error);
        failedCount++;
      }
    }

    // 履歴をクリア
    moveHistory.clearLastSession();
    
    // 結果を返信
    if (restoredCount > 0) {
      await interaction.editReply(
        `✅ ${restoredCount}人のメンバーを元のチャンネルに戻しました。` +
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の操作に失敗しました。` : '')
      );
    } else {
      await interaction.editReply('⚠️ 元に戻せるメンバーがいませんでした。');
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