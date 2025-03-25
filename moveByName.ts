import { SlashCommandBuilder, CommandInteraction, VoiceChannel, ChannelType } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions, hasAdminPermissions } from '../../utils/permissionChecker';

export const data = new SlashCommandBuilder()
  .setName('movebyname')
  .setDescription('チャンネル名を指定してメンバーを移動させます')
  .addStringOption(option => 
    option.setName('channelname')
      .setDescription('移動先のボイスチャンネル名')
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  // 権限チェック
  if (!hasAdminPermissions(interaction.member)) {
    await interaction.reply({ 
      content: '⚠️ このコマンドを実行するには管理者権限が必要です。', 
      ephemeral: true 
    });
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

  // コマンドの処理を開始
  await interaction.deferReply();

  try {
    // チャンネル名を取得
    const channelName = interaction.options.getString('channelname', true);
    
    // 名前で一致するチャンネルを検索
    const targetChannel = interaction.guild?.channels.cache.find(
      channel => channel.type === ChannelType.GuildVoice && 
                channel.name.toLowerCase().includes(channelName.toLowerCase())
    ) as VoiceChannel;
    
    if (!targetChannel) {
      await interaction.editReply(`⚠️ "${channelName}" に一致するボイスチャンネルが見つかりません。`);
      return;
    }

    // 移動するメンバーの数をカウント
    let movedCount = 0;
    let failedCount = 0;
    
    // 全てのボイスチャンネルを取得
    const voiceChannels = interaction.guild?.channels.cache.filter(
      channel => channel.type === ChannelType.GuildVoice && channel.id !== targetChannel.id
    );

    if (!voiceChannels || voiceChannels.size === 0) {
      await interaction.editReply('⚠️ 移動元となるボイスチャンネルが見つかりません。');
      return;
    }

    // 各チャンネルのメンバーを移動
    for (const [_, channel] of voiceChannels) {
      const voiceChannel = channel as VoiceChannel;
      
      // チャンネル内のメンバーを取得
      for (const [memberId, member] of voiceChannel.members) {
        try {
          // メンバーを移動
          await member.voice.setChannel(targetChannel);
          
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
    logger.error('moveByName コマンドの実行中にエラーが発生しました:', error);
    await interaction.editReply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}
