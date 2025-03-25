import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, Role, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('moverole')
  .setDescription('特定のロールを持つメンバーを指定のボイスチャンネルに移動します')
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

  const role = interaction.options.getRole('role');
  const targetChannel = interaction.options.getChannel('channel');
  
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
    let notInVoiceCount = 0;
    
    // 指定されたロールを持つメンバーを取得
    const membersWithRole = await interaction.guild?.members.fetch();
    const targetMembers = membersWithRole?.filter(member => 
      member.roles.cache.has(role.id) && 
      member.voice.channelId && 
      member.voice.channelId !== targetChannel.id
    );

    if (!targetMembers || targetMembers.size === 0) {
      await interaction.editReply(`⚠️ ロール「${role.name}」を持ち、ボイスチャンネルに接続しているメンバーが見つかりません。`);
      return;
    }

    // 各メンバーを移動
    for (const [_, member] of targetMembers) {
      try {
        // 現在のチャンネル名を取得
        const currentChannel = member.voice.channel;
        if (!currentChannel) {
          notInVoiceCount++;
          continue;
        }

        // 移動前の情報を保存
        const sourceChannelId = member.voice.channelId;
        const sourceChannelName = currentChannel.name;
        
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
          `メンバー ${member.user.tag} を ${currentChannel.name} から ${targetChannel.name} に移動しました (ロール: ${role.name})`
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
        `✅ ロール「${role.name}」を持つ ${movedCount}人のメンバーを ${targetChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await interaction.editReply(
        `⚠️ ロール「${role.name}」を持つメンバーの移動に失敗しました。` +
        (notInVoiceCount > 0 ? `\n${notInVoiceCount}人はボイスチャンネルに接続していません。` : '')
      );
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
