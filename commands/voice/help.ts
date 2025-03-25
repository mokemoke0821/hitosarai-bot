import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('ボットのコマンド一覧と使い方を表示します')
  .addStringOption(option => 
    option.setName('command')
      .setDescription('詳細を表示するコマンド名')
      .setRequired(false)
      .addChoices(
        { name: 'moveall', value: 'moveall' },
        { name: 'movefrom', value: 'movefrom' },
        { name: 'moverole', value: 'moverole' },
        { name: 'movebyname', value: 'movebyname' },
        { name: 'undolastmove', value: 'undolastmove' },
        { name: 'savepattern', value: 'savepattern' },
        { name: 'loadpattern', value: 'loadpattern' },
        { name: 'listpatterns', value: 'listpatterns' },
        { name: 'deletepattern', value: 'deletepattern' },
        { name: 'status', value: 'status' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      // 特定のコマンドの詳細ヘルプを表示
      await showCommandHelp(interaction, commandName);
    } else {
      // 全コマンドの概要を表示
      await showAllCommands(interaction);
    }
  } catch (error) {
    logger.error('help コマンドの実行中にエラーが発生しました:', error);
    
    if (interaction.deferred) {
      await interaction.editReply('⚠️ コマンドの実行中にエラーが発生しました。');
    } else {
      await interaction.reply({ 
        content: '⚠️ コマンドの実行中にエラーが発生しました。',
        ephemeral: true 
      });
    }
  }
}

/**
 * 全コマンドの概要を表示
 */
async function showAllCommands(interaction: ChatInputCommandInteraction) {
  await interaction.reply({ embeds: [{
    color: 0x0099ff,
    title: 'Discord Voice Mover Bot ヘルプ',
    description: 'ボイスチャンネル間でメンバーを移動させるためのBotです。',
    fields: [
      { name: '基本コマンド', value: 
        '`/moveall [channel]` - 全チャンネルからメンバーを移動\n' +
        '`/movefrom [from] [to]` - 特定チャンネルからメンバーを移動\n' +
        '`/moverole [role] [channel]` - 特定ロールのメンバーを移動\n' +
        '`/movebyname [channelname]` - チャンネル名で指定して移動\n' +
        '`/undolastmove` - 最後の移動を元に戻す'
      },
      { name: 'パターン管理', value: 
        '`/savepattern [name]` - 移動パターンを保存\n' +
        '`/loadpattern [name]` - 保存したパターンを実行\n' +
        '`/listpatterns` - 保存済みパターン一覧\n' +
        '`/deletepattern [name]` - パターンを削除'
      },
      { name: 'システム', value: 
        '`/help [command]` - ヘルプを表示\n' +
        '`/status` - Botのステータスを表示'
      }
    ],
    footer: { text: '詳細は /help [コマンド名] で確認できます' }
  }] });
}

/**
 * 特定のコマンドの詳細ヘルプを表示
 */
async function showCommandHelp(interaction: ChatInputCommandInteraction, commandName: string) {
  // コマンドごとのヘルプ内容を作成
  let embedData: any = {
    color: 0x0099ff,
    title: `/${commandName} コマンドのヘルプ`,
    description: '',
    fields: []
  };

  switch (commandName) {
    case 'moveall':
      embedData.description = 'すべてのボイスチャンネルのメンバーを指定したチャンネルに移動します。';
      embedData.fields = [
        { name: '使い方', value: '`/moveall [channel]`' },
        { name: 'オプション', value: '`channel` - 移動先のボイスチャンネル（必須）' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/moveall #雑談チャンネル`' }
      ];
      break;
    
    case 'movefrom':
      embedData.description = '特定のボイスチャンネルからメンバーを別のチャンネルに移動します。';
      embedData.fields = [
        { name: '使い方', value: '`/movefrom [from] [to]`' },
        { name: 'オプション', value: '`from` - 移動元のボイスチャンネル（必須）\n`to` - 移動先のボイスチャンネル（必須）' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/movefrom #ロビー #会議室`' }
      ];
      break;
    
    case 'moverole':
      embedData.description = '特定のロールを持つメンバーを指定したボイスチャンネルに移動します。';
      embedData.fields = [
        { name: '使い方', value: '`/moverole [role] [channel]`' },
        { name: 'オプション', value: '`role` - 移動対象のロール（必須）\n`channel` - 移動先のボイスチャンネル（必須）' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/moverole @管理者 #管理者チャンネル`' }
      ];
      break;
    
    case 'movebyname':
      embedData.description = 'チャンネル名で指定したボイスチャンネルにメンバーを移動します。';
      embedData.fields = [
        { name: '使い方', value: '`/movebyname [channelname] [from]`' },
        { name: 'オプション', value: '`channelname` - 移動先チャンネルの名前（部分一致可、必須）\n`from` - 移動元のボイスチャンネル（省略可）' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/movebyname 会議`' }
      ];
      break;
    
    case 'undolastmove':
      embedData.description = '最後に実行した移動操作を元に戻します。';
      embedData.fields = [
        { name: '使い方', value: '`/undolastmove`' },
        { name: 'オプション', value: 'なし' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/undolastmove`' },
        { name: '注意事項', value: '直前の移動操作のみ元に戻せます。メンバーが自分で移動した場合は元に戻せません。' }
      ];
      break;
    
    case 'savepattern':
      embedData.description = '現在の移動パターンを名前を付けて保存します。';
      embedData.fields = [
        { name: '使い方', value: '`/savepattern [name] [from] [to]`' },
        { name: 'オプション', value: '`name` - パターンの名前（必須）\n`from` - 移動元のチャンネル（必須）\n`to` - 移動先のチャンネル（必須）' },
        { name: '必要な権限', value: '管理者権限' },
        { name: '使用例', value: '`/savepattern 会議開始 #ロビー #会議室`' }
      ];
      break;
    
    case 'loadpattern':
      embedData.description = '保存した移動パターンを読み込んで実行します。';
      embedData.fields = [
        { name: '使い方', value: '`/loadpattern [name]`' },
        { name: 'オプション', value: '`name` - パターンの名前（必須）' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/loadpattern 会議開始`' }
      ];
      break;
    
    case 'listpatterns':
      embedData.description = '保存されている移動パターンの一覧を表示します。';
      embedData.fields = [
        { name: '使い方', value: '`/listpatterns`' },
        { name: 'オプション', value: 'なし' },
        { name: '必要な権限', value: '管理者権限またはメンバーの移動権限' },
        { name: '使用例', value: '`/listpatterns`' }
      ];
      break;
    
    case 'deletepattern':
      embedData.description = '保存した移動パターンを削除します。';
      embedData.fields = [
        { name: '使い方', value: '`/deletepattern [name]`' },
        { name: 'オプション', value: '`name` - パターンの名前（必須）' },
        { name: '必要な権限', value: '管理者権限' },
        { name: '使用例', value: '`/deletepattern 会議開始`' }
      ];
      break;
    
    case 'status':
      embedData.description = 'Botの現在のステータスと統計情報を表示します。';
      embedData.fields = [
        { name: '使い方', value: '`/status`' },
        { name: 'オプション', value: 'なし' },
        { name: '必要な権限', value: 'なし' },
        { name: '使用例', value: '`/status`' }
      ];
      break;
    
    default:
      embedData.description = '指定されたコマンドの情報が見つかりません。';
      embedData.color = 0xff0000;
      break;
  }

  await interaction.reply({ 
    embeds: [embedData],
    ephemeral: true 
  });
}
