import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel, ChannelType, User } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('movemembers')
  .setDescription('指定したメンバーを特定のボイスチャンネルに移動します')
  .addChannelOption(option => 
    option.setName('channel')
      .setDescription('移動先のボイスチャンネル')
      .setRequired(true)
  )
  .addUserOption(option => 
    option.setName('user1')
      .setDescription('移動させるメンバー1')
      .setRequired(true)
  )
  .addUserOption(option => 
    option.setName('user2')
      .setDescription('移動させるメンバー2')
      .setRequired(false)
  )
  .addUserOption(option => 
    option.setName('user3')
      .setDescription('移動させるメンバー3')
      .setRequired(false)
  )
  .addUserOption(option => 
    option.setName('user4')
      .setDescription('移動させるメンバー4')
      .setRequired(false)
  )
  .addUserOption(option => 
    option.setName('user5')
      .setDescription('移動させるメンバー5')
      .setRequired(false)
  )
  .addUserOption(option => 
    option.setName('user6')
      .setDescription('移動させるメンバー6')
      .setRequired(false)
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

  try {
    await interaction.deferReply();

    // 新しい移動セッションを開始
    const sessionId = moveHistory.startNewSession(
      interaction.user.id,
      interaction.user.tag
    );

    // 移動先のチャンネルを取得
    const targetChannel = interaction.options.getChannel('channel');
    
    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      await interaction.editReply('⚠️ 指定されたチャンネルがボイスチャンネルではありません。');
      return;
    }

    // 指定されたユーザーを取得
    const users: User[] = [];
    
    for (let i = 1; i <= 6; i++) {
      const user = interaction.options.getUser(`user${i}`);
      if (user) {
        users.push(user);
      }
    }

    if (users.length === 0) {
      await interaction.editReply('⚠️ 移動させるメンバーが指定されていません。');
      return;
    }

    // ユーザーをGuildMemberに変換
    const members = [];
    
    for (const user of users) {
      try {
        const member = await interaction.guild?.members.fetch(user.id);
        
        if (member) {
          // ボイスチャンネルに接続しているか確認
          if (member.voice.channelId) {
            members.push(member);
          }
        }
      } catch (error) {
        logger.error(`メンバー ${user.tag} の取得に失敗しました:`, error);
      }
    }

    if (members.length === 0) {
      await interaction.editReply('⚠️ 指定されたメンバーでボイスチャンネルに接続しているメンバーが見つかりません。');
      return;
    }

    // メンバーを移動
    let movedCount = 0;
    let failedCount = 0;
    let notConnectedCount = 0;
    
    for (const member of members) {
      try {
        // すでに対象のチャンネルにいる場合はスキップ
        if (member.voice.channelId === targetChannel.id) {
          notConnectedCount++;
          continue;
        }
        
        // 移動前の情報を保存
        const sourceChannelId = member.voice.channelId;
        const sourceChannelName = member.voice.channel?.name || '不明なチャンネル';
        
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
          `メンバー ${member.user.tag} を ${sourceChannelName} から ${targetChannel.name} に移動しました`
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
    let replyMessage = '';
    
    if (movedCount > 0) {
      replyMessage += `✅ ${movedCount}人のメンバーを ${targetChannel.name} に移動しました。`;
    }
    
    if (notConnectedCount > 0) {
      if (replyMessage) replyMessage += '\n';
      replyMessage += `ℹ️ ${notConnectedCount}人のメンバーはすでに ${targetChannel.name} にいたためスキップしました。`;
    }
    
    if (failedCount > 0) {
      if (replyMessage) replyMessage += '\n';
      replyMessage += `⚠️ ${failedCount}人のメンバーの移動に失敗しました。`;
    }
    
    if (!replyMessage) {
      replyMessage = '⚠️ メンバーの移動は行われませんでした。';
    }
    
    await interaction.editReply(replyMessage);
  } catch (error) {
    logger.error('movemembers コマンドの実行中にエラーが発生しました:', error);
    
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