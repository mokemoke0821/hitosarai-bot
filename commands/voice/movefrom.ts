import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('movefrom')
  .setDescription('指定のボイスチャンネルから別のチャンネルにメンバーを移動します')
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

  const sourceChannel = interaction.options.getChannel('from');
  const targetChannel = interaction.options.getChannel('to');
  
  // チャンネルの種類をチェック
  if (!sourceChannel || sourceChannel.type !== 2 || !targetChannel || targetChannel.type !== 2) {
    await interaction.reply({ 
      content: '⚠️ 指定されたチャンネルがボイスチャンネルではありません。',
      ephemeral: true 
    });
    return;
  }

  // 同じチャンネルを選択した場合はエラー
  if (sourceChannel.id === targetChannel.id) {
    await interaction.reply({
      content: '⚠️ 移動元と移動先が同じチャンネルです。',
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.deferReply();

    // ソースチャンネルを取得
    const voiceChannel = interaction.guild?.channels.cache.get(sourceChannel.id) as VoiceChannel;
    
    if (!voiceChannel || !voiceChannel.members || voiceChannel.members.size === 0) {
      await interaction.editReply('⚠️ 移動元のチャンネルにメンバーがいません。');
      return;
    }

    // 新しい移動セッションを開始
    const sessionId = moveHistory.startNewSession(
      interaction.user.id,
      interaction.user.tag
    );

    // メンバーを移動
    let movedCount = 0;
    let failedCount = 0;
    
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
      await interaction.editReply('⚠️ 移動するメンバーが見つかりませんでした。');
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