import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { patternManager } from '../../utils/patternManager';

export const data = new SlashCommandBuilder()
  .setName('savepattern')
  .setDescription('ボイスチャンネル移動パターンを保存します')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('パターンの名前')
      .setRequired(true)
  )
  .addChannelOption(option => 
    option.setName('from')
      .setDescription('移動元のボイスチャンネル')
      .setRequired(true)
  )
  .addChannelOption(option => 
    option.setName('to')
      .setDescription('移動先のボイスチャンネル')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers);

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

  const patternName = interaction.options.getString('name');
  const fromChannel = interaction.options.getChannel('from');
  const toChannel = interaction.options.getChannel('to');
  
  // チャンネルの種類をチェック
  if (!fromChannel || fromChannel.type !== 2) { // 2 = GuildVoice
    await interaction.reply({ 
      content: '⚠️ 指定された移動元チャンネルがボイスチャンネルではありません。',
      ephemeral: true 
    });
    return;
  }

  if (!toChannel || toChannel.type !== 2) { // 2 = GuildVoice
    await interaction.reply({ 
      content: '⚠️ 指定された移動先チャンネルがボイスチャンネルではありません。',
      ephemeral: true 
    });
    return;
  }

  if (fromChannel.id === toChannel.id) {
    await interaction.reply({ 
      content: '⚠️ 移動元と移動先のチャンネルが同じです。',
      ephemeral: true 
    });
    return;
  }

  try {
    // 既存のパターンをチェック
    const existingPattern = patternManager.getPattern(patternName, interaction.guildId);
    if (existingPattern) {
      // 上書き確認
      await interaction.reply({ 
        content: `⚠️ パターン「${patternName}」は既に存在します。上書きしますか？`,
        ephemeral: true,
        // 将来的にはボタンで上書き確認するとよい
      });
      return;
    }

    // パターンを保存
    const fromChannelVoice = fromChannel as VoiceChannel;
    const toChannelVoice = toChannel as VoiceChannel;
    
    const success = patternManager.savePattern({
      name: patternName,
      createdBy: interaction.user.id,
      createdByUsername: interaction.user.tag,
      fromChannelId: fromChannel.id,
      fromChannelName: fromChannelVoice.name,
      toChannelId: toChannel.id,
      toChannelName: toChannelVoice.name,
      createdAt: Date.now(),
      guildId: interaction.guildId
    });

    if (success) {
      await interaction.reply({ 
        content: `✅ パターン「${patternName}」を保存しました。\n` +
                 `移動元: ${fromChannelVoice.name} → 移動先: ${toChannelVoice.name}` +
                 `\n\n使用方法: \`/loadpattern ${patternName}\``,
        ephemeral: false
      });
    } else {
      await interaction.reply({ 
        content: `⚠️ パターン「${patternName}」の保存に失敗しました。`,
        ephemeral: true 
      });
    }
  } catch (error) {
    logger.error('savepattern コマンドの実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
      ephemeral: true 
    });
  }
}