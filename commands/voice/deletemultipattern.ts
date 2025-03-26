import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { multipatternManager } from '../../utils/multipatternManager';

export const data = new SlashCommandBuilder()
  .setName('deletemultipattern')
  .setDescription('保存済みのマルチパターンを削除します')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('削除するマルチパターンの名前')
      .setRequired(true)
  )
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

  const patternName = interaction.options.getString('name');
  
  // マルチパターンを取得
  const multiPattern = multipatternManager.getMultiPattern(patternName, interaction.guildId);
  if (!multiPattern) {
    await interaction.reply({ 
      content: `⚠️ マルチパターン「${patternName}」が見つかりません。'/listmultipatterns'で利用可能なパターンを確認してください。`,
      ephemeral: true 
    });
    return;
  }

  try {
    // マルチパターンの作成者かどうか確認
    const isCreator = multiPattern.createdBy === interaction.user.id;
    
    // 削除を実行
    const success = multipatternManager.deleteMultiPattern(patternName, interaction.guildId);
    
    if (success) {
      await interaction.reply(`✅ マルチパターン「${patternName}」を削除しました。`);
    } else {
      await interaction.reply({ 
        content: `⚠️ マルチパターン「${patternName}」の削除に失敗しました。`,
        ephemeral: true 
      });
    }
  } catch (error) {
    logger.error('deletemultipattern コマンドの実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
      ephemeral: true 
    });
  }
}