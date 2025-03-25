import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// 移動パターンの型定義
export interface MovePattern {
  name: string;
  createdBy: string;
  createdByUsername: string;
  fromChannelId: string;
  fromChannelName: string;
  toChannelId: string;
  toChannelName: string;
  createdAt: number;
  guildId: string;
}

/**
 * 移動パターンを管理するクラス
 */
class PatternManager {
  private patterns: Map<string, MovePattern> = new Map();
  private patternsDir: string;
  
  constructor() {
    // パターン保存用ディレクトリの作成
    this.patternsDir = path.join(process.cwd(), 'data', 'patterns');
    this.ensureDirectoryExists();
    this.loadPatterns();
  }

  /**
   * 保存用ディレクトリの存在を確認し、なければ作成
   */
  private ensureDirectoryExists(): void {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    if (!fs.existsSync(this.patternsDir)) {
      fs.mkdirSync(this.patternsDir);
    }
  }

  /**
   * 保存されたパターンを読み込む
   */
  private loadPatterns(): void {
    try {
      // ディレクトリ内のJSONファイルを読み込み
      const files = fs.readdirSync(this.patternsDir).filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(this.patternsDir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const pattern = JSON.parse(data) as MovePattern;
          
          // Mapに追加（キーはパターン名とギルドIDの組み合わせ）
          this.patterns.set(this.getPatternKey(pattern.name, pattern.guildId), pattern);
        } catch (error) {
          logger.error(`パターンファイル ${file} の読み込みに失敗しました:`, error);
        }
      }
      
      logger.info(`${this.patterns.size} 個の移動パターンを読み込みました`);
    } catch (error) {
      logger.error('移動パターンの読み込みに失敗しました:', error);
    }
  }

  /**
   * パターンのキーを生成
   */
  private getPatternKey(name: string, guildId: string): string {
    return `${guildId}:${name.toLowerCase()}`;
  }

  /**
   * 新しいパターンを保存
   */
  savePattern(pattern: MovePattern): boolean {
    try {
      const key = this.getPatternKey(pattern.name, pattern.guildId);
      
      // 既存のパターンを上書き
      this.patterns.set(key, pattern);
      
      // ファイルに保存
      const filePath = path.join(this.patternsDir, `${key.replace(':', '_')}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pattern, null, 2));
      
      logger.info(`移動パターン "${pattern.name}" を保存しました (Guild: ${pattern.guildId})`);
      return true;
    } catch (error) {
      logger.error(`移動パターン "${pattern.name}" の保存に失敗しました:`, error);
      return false;
    }
  }

  /**
   * パターンを取得
   */
  getPattern(name: string, guildId: string): MovePattern | null {
    const key = this.getPatternKey(name, guildId);
    return this.patterns.get(key) || null;
  }

  /**
   * ギルドのパターン一覧を取得
   */
  getGuildPatterns(guildId: string): MovePattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.guildId === guildId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * パターンを削除
   */
  deletePattern(name: string, guildId: string): boolean {
    try {
      const key = this.getPatternKey(name, guildId);
      if (!this.patterns.has(key)) {
        return false;
      }
      
      // メモリから削除
      this.patterns.delete(key);
      
      // ファイルからも削除
      const filePath = path.join(this.patternsDir, `${key.replace(':', '_')}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      logger.info(`移動パターン "${name}" を削除しました (Guild: ${guildId})`);
      return true;
    } catch (error) {
      logger.error(`移動パターン "${name}" の削除に失敗しました:`, error);
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const patternManager = new PatternManager();
