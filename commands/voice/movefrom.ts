import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('movefrom')
  .setDescription('特定のボイスチャンネルからメンバーを別のチャンネルに移動します')
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

  const sourceChannel = interaction.options.getChannel('from');
  const targetChannel = interaction.options.getChannel('to');
  
  // チャンネルの種類をチェック
  if (!sourceChannel || sourceChannel.type !== 2) { // 2 = GuildVoice
    await interaction.reply({ 
      content: '⚠️ 指定された移動元チャンネルがボイスチャンネルではありません。',
      ephemeral: true 
    });
    return;
  }

  if (!targetChannel || targetChannel.type !== 2) { // 2 = GuildVoice
    await interaction.reply({ 
      content: '⚠️ 指定された移動先チャンネルがボイスチャンネルではありません。',
      ephemeral: true 
    });
    return;
  }

  if (sourceChannel.id === targetChannel.id) {
    await interaction.reply({ 
      content: '⚠️ 移動元と移動先のチャンネルが同じです。',
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

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // チャンネル内のメンバーを取得
    const voiceChannel = sourceChannel as VoiceChannel;
    
    if (voiceChannel.members.size === 0) {
      await interaction.editReply(`⚠️ ${voiceChannel.name} には移動するメンバーがいません。`);
      return;
    }

    // メンバーを移動
    for (const [memberId, member] of voiceChannel.members) {
      try {
        // 移動前の情報を保存
        const sourceChannelId = member.voice.channelId;
        const sourceChannelName = voiceChannel.name;
        
        // メンバーを移動
        await member.voice.setChannel(targetChannel.id);
        
        // 移動履歴に記録
        moveHistory.addMoveRecord(sessionId, {
          userId: member.id,
          username: member.user.tag,
          sourceChannelId,
          sourceChannelName,
          targetChannelId: targetChannel.id,
          targetChannelName: targetChannel.name,
          timestamp: Date.now()
        });
        
        // ログ記録
        logger.logVoiceMovement(
          `メンバー ${member.user.tag} を ${voiceChannel.name} から ${targetChannel.name} に移動しました`
        );
        
        movedCount++;
        
        // API制限を避けるための遅延
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`メンバー ${member.user.tag} の移動に失敗しました:`, error);
        failedCount++;
      }
    }

    // 結果を返信
    if (movedCount > 0) {
      await interaction.editReply(
        `✅ ${movedCount}人のメンバーを ${voiceChannel.name} から ${targetChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await interaction.editReply('⚠️ メンバーの移動に失敗しました。');
    }
  } catch (error) {
    logger.error('movefrom コマンドの実行中にエラーが発生しました:', error);
    
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
