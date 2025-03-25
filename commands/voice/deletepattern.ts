import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger';
import { hasAdminPermissions } from '../../utils/permissionChecker';
import { patternManager } from '../../utils/patternManager';

export const data = new SlashCommandBuilder()
  .setName('deletepattern')
  .setDescription('保存したボイスチャンネル移動パターンを削除します')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('削除するパターンの名前')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // 権限チェック
  if (!hasAdminPermissions(interaction.member)) {
    await interaction.reply({ content: '⚠️ このコマンドを実行するには管理者権限が必要です。', ephemeral: true });
    return;
  }

  const patternName = interaction.options.getString('name');
  
  try {
    // パターンの存在を確認
    const pattern = patternManager.getPattern(patternName, interaction.guildId);
    if (!pattern) {
      await interaction.reply({ 
        content: `⚠️ パターン「${patternName}」が見つかりません。'/listpatterns'で正確な名前を確認してください。`,
        ephemeral: true 
      });
      return;
    }

    // 作成者か管理者のみ削除可能（追加のセキュリティとして）
    if (pattern.createdBy !== interaction.user.id && !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ 
        content: `⚠️ このパターンは他のユーザーが作成したため削除できません。サーバー管理者にお問い合わせください。`,
        ephemeral: true 
      });
      return;
    }

    // パターンを削除
    const success = patternManager.deletePattern(patternName, interaction.guildId);
    
    if (success) {
      await interaction.reply(`✅ パターン「${patternName}」を削除しました。`);
    } else {
      await interaction.reply({ 
        content: `⚠️ パターン「${patternName}」の削除に失敗しました。`,
        ephemeral: true 
      });
    }
  } catch (error) {
    logger.error('deletepattern コマンドの実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
      ephemeral: true 
    });
  }
}
