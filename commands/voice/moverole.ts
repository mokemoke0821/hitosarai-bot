import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel, GuildMember } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('moverole')
  .setDescription('特定のロールを持つユーザーを別のボイスチャンネルに移動します')
  .addRoleOption(option => 
    option.setName('role')
      .setDescription('移動対象のロール')
      .setRequired(true)
  )
  .addChannelOption(option => 
    option.setName('channel')
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

  const role = interaction.options.getRole('role');
  const targetChannel = interaction.options.getChannel('channel');
  
  if (!role) {
    await interaction.reply({ 
      content: '⚠️ 指定されたロールが見つかりません。',
      ephemeral: true 
    });
    return;
  }
  
  // チャンネルの種類をチェック
  if (!targetChannel || targetChannel.type !== 2) { // 2 = GuildVoice
    await interaction.reply({ 
      content: '⚠️ 指定されたチャンネルがボイスチャンネルではありません。',
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
    
    // 全てのボイスチャンネルを取得
    const voiceChannels = interaction.guild?.channels.cache.filter(
      channel => channel.type === 2 && channel.id !== targetChannel.id
    );

    if (!voiceChannels || voiceChannels.size === 0) {
      await interaction.editReply('⚠️ 移動元となるボイスチャンネルが見つかりません。');
      return;
    }

    // 各チャンネルから指定ロールを持つメンバーを探して移動
    for (const [_, channel] of voiceChannels) {
      const voiceChannel = channel as VoiceChannel;
      
      for (const [memberId, member] of voiceChannel.members) {
        // ロールを持っているかチェック
        if (member.roles.cache.has(role.id)) {
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
              `ロール ${role.name} を持つメンバー ${member.user.tag} を ${voiceChannel.name} から ${targetChannel.name} に移動しました`
            );
            
            movedCount++;
            
            // API制限を避けるための遅延
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            logger.error(`メンバー ${member.user.tag} の移動に失敗しました:`, error);
            failedCount++;
          }
        }
      }
    }

    // 結果を返信
    if (movedCount > 0) {
      await interaction.editReply(
        `✅ ロール ${role.name} を持つ ${movedCount}人のメンバーを ${targetChannel.name} に移動しました。` +
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await interaction.editReply(`⚠️ ロール ${role.name} を持つボイスチャンネル内のメンバーが見つかりませんでした。`);
    }
  } catch (error) {
    logger.error('moverole コマンドの実行中にエラーが発生しました:', error);
    
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