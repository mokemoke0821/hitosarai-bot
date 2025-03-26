import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, VoiceChannel, ChannelType } from 'discord.js';
import { logger } from '../../utils/logger';
import { checkBotPermissions } from '../../utils/permissionChecker';
import { multipatternManager, MoveEntry } from '../../utils/multipatternManager';

export const data = new SlashCommandBuilder()
  .setName('savemultipattern')
  .setDescription('複数の移動パターンをセットで保存します')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('パターンセットの名前')
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName('entries')
      .setDescription('移動エントリ (from1-to1,from2-to2,...) チャンネルIDかチャンネル名を使用')
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
  const entriesString = interaction.options.getString('entries');
  
  if (!patternName || !entriesString) {
    await interaction.reply({ 
      content: '⚠️ パターン名と移動エントリを指定してください。',
      ephemeral: true 
    });
    return;
  }

  // 既存のパターンをチェック
  const existingPattern = multipatternManager.getMultiPattern(patternName, interaction.guildId);
  if (existingPattern) {
    await interaction.reply({ 
      content: `⚠️ マルチパターン「${patternName}」は既に存在します。別の名前を使用するか、先に削除してください。`,
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.deferReply();
    
    // 入力文字列をパース
    // 形式: "from1-to1,from2-to2,..."
    const entriesParts = entriesString.split(',');
    
    if (entriesParts.length === 0) {
      await interaction.editReply('⚠️ 移動エントリが指定されていません。「元チャンネル-先チャンネル」の形式でカンマ区切りで指定してください。');
      return;
    }
    
    const moveEntries: MoveEntry[] = [];
    const validEntries: string[] = [];
    const invalidEntries: string[] = [];
    
    for (const entryStr of entriesParts) {
      const [fromStr, toStr] = entryStr.trim().split('-');
      
      if (!fromStr || !toStr) {
        invalidEntries.push(entryStr);
        continue;
      }
      
      // チャンネルを検索 (ID または名前で)
      let fromChannel: VoiceChannel | null = null;
      let toChannel: VoiceChannel | null = null;
      
      // IDとして検索
      fromChannel = interaction.guild.channels.cache.get(fromStr) as VoiceChannel;
      toChannel = interaction.guild.channels.cache.get(toStr) as VoiceChannel;
      
      // 名前として検索 (IDで見つからなかった場合)
      if (!fromChannel) {
        fromChannel = interaction.guild.channels.cache.find(
          channel => channel.type === ChannelType.GuildVoice && 
                    channel.name.toLowerCase() === fromStr.toLowerCase()
        ) as VoiceChannel;
      }
      
      if (!toChannel) {
        toChannel = interaction.guild.channels.cache.find(
          channel => channel.type === ChannelType.GuildVoice && 
                    channel.name.toLowerCase() === toStr.toLowerCase()
        ) as VoiceChannel;
      }
      
      // チャンネルが見つからないか、ボイスチャンネルでない場合はスキップ
      if (!fromChannel || fromChannel.type !== ChannelType.GuildVoice || 
          !toChannel || toChannel.type !== ChannelType.GuildVoice) {
        invalidEntries.push(entryStr);
        continue;
      }
      
      // 同じチャンネルの場合はスキップ
      if (fromChannel.id === toChannel.id) {
        invalidEntries.push(entryStr);
        continue;
      }
      
      // 有効なエントリを追加
      moveEntries.push({
        fromChannelId: fromChannel.id,
        fromChannelName: fromChannel.name,
        toChannelId: toChannel.id,
        toChannelName: toChannel.name
      });
      
      validEntries.push(`${fromChannel.name} → ${toChannel.name}`);
    }
    
    if (moveEntries.length === 0) {
      await interaction.editReply('⚠️ 有効な移動エントリがありません。チャンネルIDまたは名前が正しいか確認してください。');
      return;
    }
    
    // マルチパターンを保存
    const success = multipatternManager.saveMultiPattern({
      name: patternName,
      createdBy: interaction.user.id,
      createdByUsername: interaction.user.tag,
      createdAt: Date.now(),
      guildId: interaction.guildId,
      moves: moveEntries
    });
    
    if (success) {
      let replyMessage = `✅ マルチパターン「${patternName}」を保存しました。\n`;
      replyMessage += `移動パターン数: ${moveEntries.length}\n`;
      replyMessage += '移動パターン一覧:\n';
      
      for (let i = 0; i < validEntries.length; i++) {
        replyMessage += `${i + 1}. ${validEntries[i]}\n`;
      }
      
      if (invalidEntries.length > 0) {
        replyMessage += `\n⚠️ 以下の ${invalidEntries.length} 個のエントリは無効でした:\n`;
        for (const entry of invalidEntries) {
          replyMessage += `- ${entry}\n`;
        }
      }
      
      replyMessage += `\n使用方法: \`/loadmultipattern ${patternName}\``;
      
      await interaction.editReply(replyMessage);
    } else {
      await interaction.editReply(`⚠️ マルチパターン「${patternName}」の保存に失敗しました。`);
    }
  } catch (error) {
    logger.error('savemultipattern コマンドの実行中にエラーが発生しました:', error);
    await interaction.editReply('⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。');
  }
}
