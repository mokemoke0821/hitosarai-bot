import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel, ChannelType } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { moveHistory } from '../../utils/moveHistory';

export const data = new SlashCommandBuilder()
  .setName('splitvoice')
  .setDescription('メンバーを複数のボイスチャンネルに分散させます')
  .addStringOption(option => 
    option.setName('channels')
      .setDescription('分散先のチャンネルID（カンマ区切り）または "category" でカテゴリー内の全チャンネルに分散')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('method')
      .setDescription('分散方法')
      .setRequired(true)
      .addChoices(
        { name: 'ランダム', value: 'random' },
        { name: '均等に分散', value: 'equal' },
        { name: '順番に分散', value: 'sequential' }
      )
  )
  .addChannelOption(option => 
    option.setName('source')
      .setDescription('メンバーの取得元チャンネル（指定しない場合は全チャンネル）')
      .setRequired(false)
  )
  .addStringOption(option => 
    option.setName('category')
      .setDescription('カテゴリー名（channelsで"category"を選んだ場合に使用）')
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

    const channelsOption = interaction.options.getString('channels', true);
    const method = interaction.options.getString('method', true);
    const sourceChannel = interaction.options.getChannel('source');
    const categoryName = interaction.options.getString('category');

    // ターゲットチャンネルの配列を取得
    let targetChannels: VoiceChannel[] = [];

    if (channelsOption.toLowerCase() === 'category') {
      // カテゴリー内の全チャンネルを使用
      if (!categoryName) {
        await interaction.editReply('⚠️ カテゴリーを使用する場合は、カテゴリー名を指定してください。');
        return;
      }

      const category = interaction.guild?.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes(categoryName.toLowerCase())
      );

      if (!category) {
        await interaction.editReply(`⚠️ "${categoryName}" を含む名前のカテゴリーが見つかりません。`);
        return;
      }

      targetChannels = interaction.guild?.channels.cache.filter(
        c => c.type === ChannelType.GuildVoice && c.parentId === category.id
      ).map(c => c as VoiceChannel) || [];

      if (targetChannels.length === 0) {
        await interaction.editReply(`⚠️ カテゴリー "${categoryName}" 内にボイスチャンネルが見つかりません。`);
        return;
      }
    } else {
      // カンマ区切りのチャンネルIDを使用
      const channelIds = channelsOption.split(',').map(id => id.trim());
      
      for (const channelId of channelIds) {
        const channel = interaction.guild?.channels.cache.get(channelId);
        if (channel && channel.type === ChannelType.GuildVoice) {
          targetChannels.push(channel as VoiceChannel);
        }
      }

      if (targetChannels.length === 0) {
        await interaction.editReply('⚠️ 有効なボイスチャンネルが指定されていません。');
        return;
      }
    }

    // 移動させるメンバーを取得
    let members: { id: string, member: any }[] = [];

    if (sourceChannel && sourceChannel.type === ChannelType.GuildVoice) {
      // 指定されたチャンネルからメンバーを取得
      const voiceChannel = sourceChannel as VoiceChannel;
      members = Array.from(voiceChannel.members.entries()).map(([id, member]) => ({ id, member }));
    } else {
      // すべてのボイスチャンネルからメンバーを取得（ターゲットチャンネルを除く）
      const targetChannelIds = targetChannels.map(c => c.id);
      
      interaction.guild?.channels.cache.forEach(channel => {
        if (channel.type === ChannelType.GuildVoice && !targetChannelIds.includes(channel.id)) {
          const voiceChannel = channel as VoiceChannel;
          members.push(...Array.from(voiceChannel.members.entries()).map(([id, member]) => ({ id, member })));
        }
      });
    }

    if (members.length === 0) {
      await interaction.editReply('⚠️ 移動させるメンバーが見つかりません。');
      return;
    }

    // 分散方法に基づいてメンバーを割り当て
    let assignedMembers: { [channelId: string]: { id: string, member: any }[] } = {};
    
    // 初期化
    targetChannels.forEach(channel => {
      assignedMembers[channel.id] = [];
    });

    switch (method) {
      case 'random':
        // メンバーをランダムに並べ替え
        members = members.sort(() => Math.random() - 0.5);
        
        // 順番にチャンネルに割り当て
        members.forEach((member, index) => {
          const channelIndex = index % targetChannels.length;
          assignedMembers[targetChannels[channelIndex].id].push(member);
        });
        break;
        
      case 'equal':
        // 各チャンネルに均等に分散
        const membersPerChannel = Math.ceil(members.length / targetChannels.length);
        
        targetChannels.forEach((channel, index) => {
          const start = index * membersPerChannel;
          const end = Math.min(start + membersPerChannel, members.length);
          
          for (let i = start; i < end; i++) {
            if (i < members.length) {
              assignedMembers[channel.id].push(members[i]);
            }
          }
        });
        break;
        
      case 'sequential':
        // 順番に分散（メンバーリストの順序を維持）
        members.forEach((member, index) => {
          const channelIndex = index % targetChannels.length;
          assignedMembers[targetChannels[channelIndex].id].push(member);
        });
        break;
    }

    // メンバーを移動
    let movedCount = 0;
    let failedCount = 0;
    
    for (const channelId in assignedMembers) {
      const channel = interaction.guild?.channels.cache.get(channelId) as VoiceChannel;
      
      for (const { id, member } of assignedMembers[channelId]) {
        try {
          // 移動前の情報を保存
          const sourceChannelId = member.voice.channelId;
          const sourceChannelName = member.voice.channel?.name || '不明なチャンネル';
          
          // メンバーを移動
          await member.voice.setChannel(channelId);
          
          // 移動履歴に記録
          moveHistory.addMoveRecord(sessionId, {
            userId: id,
            username: member.user.tag,
            sourceChannelId,
            sourceChannelName,
            targetChannelId: channelId,
            targetChannelName: channel.name,
            timestamp: Date.now()
          });
          
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
      let replyMessage = `✅ ${movedCount}人のメンバーを${targetChannels.length}個のチャンネルに分散しました。\n`;
      
      // 各チャンネルの割り当て結果を表示
      targetChannels.forEach(channel => {
        const count = assignedMembers[channel.id].length;
        replyMessage += `- ${channel.name}: ${count}人\n`;
      });
      
      if (failedCount > 0) {
        replyMessage += `\n⚠️ ${failedCount}人の移動に失敗しました。`;
      }
      
      await interaction.editReply(replyMessage);
    } else {
      await interaction.editReply('⚠️ メンバーの移動に失敗しました。');
    }
  } catch (error) {
    logger.error('splitvoice コマンドの実行中にエラーが発生しました:', error);
    
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