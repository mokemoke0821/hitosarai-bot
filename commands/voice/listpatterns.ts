import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger';
import { patternManager } from '../../utils/patternManager';

export const data = new SlashCommandBuilder()
  .setName('listpatterns')
  .setDescription('保存されているボイスチャンネル移動パターンの一覧を表示します');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // ギルドのパターン一覧を取得
    const patterns = patternManager.getGuildPatterns(interaction.guildId);
    
    if (patterns.length === 0) {
      await interaction.reply({ 
        content: '⚠️ 保存されている移動パターンがありません。`/savepattern`コマンドでパターンを保存してください。',
        ephemeral: true 
      });
      return;
    }

    // 埋め込みメッセージを作成
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('保存されている移動パターン一覧')
      .setDescription('以下のパターンが利用可能です。`/loadpattern [名前]`で実行できます。')
      .setTimestamp();
    
    // パターンを埋め込みメッセージに追加
    for (const pattern of patterns) {
      const createdDate = new Date(pattern.createdAt).toLocaleString('ja-JP');
      
      embed.addFields({
        name: pattern.name,
        value: `移動元: ${pattern.fromChannelName} → 移動先: ${pattern.toChannelName}\n` +
               `作成者: ${pattern.createdByUsername}\n` +
               `作成日時: ${createdDate}`
      });
    }

    // embeds配列に直接オブジェクトを追加
    await interaction.reply({ 
      embeds: [{
        color: 0x0099ff,
        title: '保存されている移動パターン一覧',
        description: '以下のパターンが利用可能です。`/loadpattern [名前]`で実行できます。',
        fields: patterns.map(pattern => {
          const createdDate = new Date(pattern.createdAt).toLocaleString('ja-JP');
          return {
            name: pattern.name,
            value: `移動元: ${pattern.fromChannelName} → 移動先: ${pattern.toChannelName}\n` +
                  `作成者: ${pattern.createdByUsername}\n` +
                  `作成日時: ${createdDate}`
          };
        }),
        timestamp: new Date().toISOString()
      }] 
    });
  } catch (error) {
    logger.error('listpatterns コマンドの実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
      ephemeral: true 
    });
  }
}
