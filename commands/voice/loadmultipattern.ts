import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel, ChannelType } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { multipatternManager } from '../../utils/multipatternManager';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('loadmultipattern')
  .setDescription('保存済みの複数の移動パターンを同時に実行します')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('マルチパターンの名前')
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
    await interaction.deferReply();

    // 新しい移動セッションを開始
    const sessionId = moveHistory.startNewSession(
      interaction.user.id,
      interaction.user.tag
    );

    // 各移動パターンを実行
    let totalMovedCount = 0;
    let totalFailedCount = 0;
    let invalidPatterns = 0;
    
    const results = [];
    
    for (const moveEntry of multiPattern.moves) {
      // チャンネルが存在するか確認
      const fromChannel = interaction.guild.channels.cache.get(moveEntry.fromChannelId) as VoiceChannel;
      const toChannel = interaction.guild.channels.cache.get(moveEntry.toChannelId) as VoiceChannel;
      
      if (!fromChannel || fromChannel.type !== ChannelType.GuildVoice) {
        results.push(`❌ 移動元チャンネル「${moveEntry.fromChannelName}」(${moveEntry.fromChannelId})が見つからないか、ボイスチャンネルではありません。`);
        invalidPatterns++;
        continue;
      }
      
      if (!toChannel || toChannel.type !== ChannelType.GuildVoice) {
        results.push(`❌ 移動先チャンネル「${moveEntry.toChannelName}」(${moveEntry.toChannelId})が見つからないか、ボイスチャンネルではありません。`);
        invalidPatterns++;
        continue;
      }
      
      // チャンネル内のメンバーを取得
      if (fromChannel.members.size === 0) {
        results.push(`ℹ️ ${fromChannel.name} には移動するメンバーがいません。`);
        continue;
      }
      
      // メンバーを移動
      let movedCount = 0;
      let failedCount = 0;
      
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
            `メンバー ${member.user.tag} を ${fromChannel.name} から ${toChannel.name} に移動しました (マルチパターン: ${patternName})`
          );
          
          movedCount++;
          totalMovedCount++;
          
          // API制限を避けるための遅延
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          logger.error(`メンバー移動に失敗しました:`, error);
          failedCount++;
          totalFailedCount++;
        }
      }
      
      results.push(`✅ ${movedCount}人のメンバーを ${fromChannel.name} から ${toChannel.name} に移動しました。${failedCount > 0 ? `(失敗: ${failedCount}人)` : ''}`);
    }

    // 結果を返信
    if (totalMovedCount > 0 || invalidPatterns > 0) {
      let replyMessage = `マルチパターン「${patternName}」の実行結果:\n\n`;
      
      for (const result of results) {
        replyMessage += `${result}\n`;
      }
      
      replyMessage += `\n合計: ${totalMovedCount}人のメンバーを移動しました。`;
      
      if (totalFailedCount > 0) {
        replyMessage += `\n⚠️ ${totalFailedCount}人の移動に失敗しました。`;
      }
      
      if (invalidPatterns > 0) {
        replyMessage += `\n⚠️ ${invalidPatterns}個の無効なパターンがありました。`;
      }
      
      await interaction.editReply(replyMessage);
    } else {
      await interaction.editReply(`⚠️ マルチパターン「${patternName}」の実行に失敗しました。メンバーの移動ができませんでした。`);
    }
  } catch (error) {
    logger.error('loadmultipattern コマンドの実行中にエラーが発生しました:', error);
    await interaction.editReply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}