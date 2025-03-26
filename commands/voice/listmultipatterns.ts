import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { multipatternManager } from '../../utils/multipatternManager';

export const data = new SlashCommandBuilder()
  .setName('listmultipatterns')
  .setDescription('保存済みのマルチパターン一覧を表示します')
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  const permissionCheck = checkBotPermissions(interaction.guild);
  if (!permissionCheck.hasPermissions) {
    await interaction.reply({ 
      content: `⚠️ Botに必要な権限がありません。不足している権限: ${permissionCheck.missingPermissions.join(', ')}`,
      ephemeral: true 
    });
    return;
  }

  try {
    // このサーバーで利用可能なパターンを取得
    const patterns = multipatternManager.getAllMultiPatterns(interaction.guildId);
    
    if (patterns.length === 0) {
      await interaction.reply('ℹ️ このサーバーにはまだマルチパターンが保存されていません。`/savemultipattern` で保存してください。');
      return;
    }
    
    // パターンのリストを作成
    let replyMessage = `📋 保存済みマルチパターン一覧 (${patterns.length}件):\n\n`;
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const date = new Date(pattern.createdAt).toLocaleString();
      
      replyMessage += `**${i + 1}. ${pattern.name}** (作成者: ${pattern.createdByUsername}, ${date})\n`;
      replyMessage += `   移動パターン数: ${pattern.moves.length}\n`;
      
      // 各移動パターンの詳細（最大5つまで表示）
      const maxMovesToShow = Math.min(5, pattern.moves.length);
      
      for (let j = 0; j < maxMovesToShow; j++) {
        const move = pattern.moves[j];
        replyMessage += `   ${j + 1}. ${move.fromChannelName} → ${move.toChannelName}\n`;
      }
      
      if (pattern.moves.length > maxMovesToShow) {
        replyMessage += `   ... 他 ${pattern.moves.length - maxMovesToShow} 件\n`;
      }
      
      replyMessage += `   使用方法: \`/loadmultipattern ${pattern.name}\`\n\n`;
    }
    
    await interaction.reply(replyMessage);
  } catch (error) {
    logger.error('listmultipatterns コマンドの実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
      ephemeral: true 
    });
  }
}