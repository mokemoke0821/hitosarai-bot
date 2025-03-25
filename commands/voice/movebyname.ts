import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('movebyname')
  .setDescription('チャンネル名で指定したボイスチャンネルにメンバーを移動します')
  .addStringOption(option => 
    option.setName('channelname')
      .setDescription('移動先ボイスチャンネルの名前（部分一致可）')
      .setRequired(true)
  )
  .addChannelOption(option => 
    option.setName('from')
      .setDescription('移動元のボイスチャンネル（指定しない場合は全チャンネルから）')
      .setRequired(false)
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

  const channelName = interaction.options.getString('channelname');
  const fromChannel = interaction.options.getChannel('from');
  
  // 移動先チャンネルの検索
  const targetChannels = interaction.guild?.channels.cache.filter(
    channel => channel.type === 2 && channel.name.toLowerCase().includes(channelName.toLowerCase())
  );

  if (!targetChannels || targetChannels.size === 0) {
    await interaction.reply({ 
      content: `⚠️ 名前に「${channelName}」を含むボイスチャンネルが見つかりません。`,
      ephemeral: true 
    });
    return;
  }

  // 複数のチャンネルが見つかった場合
  if (targetChannels.size > 1) {
    const channelList = targetChannels.map(ch => `・${ch.name}`).join('\n');
    await interaction.reply({ 
      content: `⚠️ 複数のチャンネルが見つかりました。より具体的な名前を指定してください：\n${channelList}`,
      ephemeral: true 
    });
    return;
  }

  // 見つかったチャンネル（1つだけ）
  const targetChannel = targetChannels.first() as VoiceChannel;

  // 移動元チャンネルのチェック
  if (fromChannel && fromChannel.type !== 2) {
    await interaction.reply({ 
      content: '⚠️ 指定された移動元チャンネルがボイスチャンネルではありません。',
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
    
    // 移動元チャンネルの決定
    let sourceChannels;
    if (fromChannel) {
      // 特定のチャンネルから移動
      sourceChannels = new Map([[fromChannel.id, fromChannel]]);
    } else {
      // すべてのチャンネルから移動
      sourceChannels = interaction.guild?.channels.cache.filter(
        channel => channel.type === 2 && channel.id !== targetChannel.id
      );
    }

    if (!sourceChannels || sourceChannels.size === 0) {
      await interaction.editReply('⚠️ 移動元となるボイスチャンネルが見つかりません。');
      return;
    }

    // 各チャンネルのメンバーを移動
    for (const [_, channel] of sourceChannels) {
      const voiceChannel = channel as VoiceChannel;
      
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
    }

    // 結果を返信
    if (movedCount > 0) {
      await interaction.editReply(
        `✅ ${movedCount}人のメンバーを ${targetChannel.name} に移動しました。` + 
        (failedCount > 0 ? `\n⚠️ ${failedCount}人の移動に失敗しました。` : '')
      );
    } else {
      await interaction.editReply('⚠️ 移動するメンバーが見つかりませんでした。');
    }
  } catch (error) {
    logger.error('movebyname コマンドの実行中にエラーが発生しました:', error);
    
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
