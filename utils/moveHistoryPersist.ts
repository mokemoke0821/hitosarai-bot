import fs from 'fs';
import path from 'path';

// データディレクトリパス
const dataDir = path.join(process.cwd(), 'data');
const historyFilePath = path.join(dataDir, 'move-history.json');

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * 移動履歴の永続化ユーティリティ
 */
export const moveHistoryPersist = {
  /**
   * 履歴データをファイルに保存する
   * @param data 保存するデータ
   */
  saveHistory: (data: any): void => {
    try {
      fs.writeFileSync(historyFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('履歴データの保存に失敗しました:', error);
    }
  },

  /**
   * 履歴データをファイルから読み込む
   * @returns 読み込んだデータ、または空の配列（ファイルが存在しない場合）
   */
  loadHistory: (): any => {
    try {
      if (fs.existsSync(historyFilePath)) {
        const data = fs.readFileSync(historyFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('履歴データの読み込みに失敗しました:', error);
    }
    return { sessions: [] };
  }
};
