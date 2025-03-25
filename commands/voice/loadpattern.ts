import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';
import { patternManager } from '../../utils/patternManager';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('loadpattern')
  .setDescription('保存したボイスチャンネル移動パターンを実行します')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('パターンの名前')
      .setRequired(true)
  )
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

  const patternName = interaction.options.getString('name');
  
  // パターンを取得
  const pattern = patternManager.getPattern(patternName, interaction.guildId);
  if (!pattern) {
    await interaction.reply({ 
      content: `⚠️ パターン「${patternName}」が見つかりません。'/listpatterns'で利用可能なパターンを確認してください。`,
      ephemeral: true 
    });
    return;
  }

  try {
    await interaction.deferReply();

    // チャンネルが存在するか確認
    const fromChannel = interaction.guild.channels.cache.get(pattern.fromChannelId) as VoiceChannel;
    const toChannel = interaction.guild.channels.cache.get(pattern.toChannelId) as VoiceChannel;
    
    if (!fromChannel || fromChannel.type !== 2) {
      await interaction.editReply(`⚠️ 移動元チャンネル「${pattern.fromChannelName}」が見つからないか、ボイスチャンネルではありません。`);
      return;
    }
    
    if (!toChannel || toChannel.type !== 2) {
      await interaction.editReply(`⚠️ 移動先チャンネル「${pattern.toChannelName}」が見つからないか、ボイスチャンネルではありません。`);
      return;
    }

    // 新しい移動セッションを開始
    const sessionId = moveHistory.startNewSession(
      interaction.user.id,
      interaction.user.tag
    );

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // チャンネル内のメンバーを取得
    if (fromChannel.members.size === 0) {
      await interaction.editReply(`⚠️ ${fromChannel.name} には移動するメンバーがいません。`);
      return;
    }

    // メンバーを移動
    for (const [memberId, member] of fromChannel.members) {
      try {
        // 移動前の情報を保存
        const sourceChannelId = member.voice.channelId;
        const sourceChannelName = fromChannel.name;
        
        // メンバーを移動
        await member.voice.setChannel(toChannel.id);
        
        // 移動履歴に記録
        moveHistory.addMoveRecord(sessionId, {
          userId: member.id,
          username: member.user.tag,
          sourceChannelId,
          sourceChannelName,
          targetChannelId: toChannel.id,
          targetChannelName: toChannel.name,
          timestamp: Date.now()
        });
        
        // ログ記録
        logger.logVoiceMovement(
          `メンバー ${member.user.tag} を ${fromChannel.name} から ${toChannel.name} に移動しました (パターン: ${patternName})`
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
        `✅ パターン「${patternName}」を実行しました。\n` +
        `${movedCount}人のメンバーを ${fromChannel.name} から ${toChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await interaction.editReply(`⚠️ パターン「${patternName}」の実行に失敗しました。メンバーの移動ができませんでした。`);
    }
  } catch (error) {
    logger.error('loadpattern コマンドの実行中にエラーが発生しました:', error);
    
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
