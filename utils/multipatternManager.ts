import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// マルチパターンの型定義
export interface MoveEntry {
  fromChannelId: string;
  fromChannelName: string;
  toChannelId: string;
  toChannelName: string;
}

export interface MultiPattern {
  name: string;
  createdBy: string;
  createdByUsername: string;
  createdAt: number;
  guildId: string;
  moves: MoveEntry[];
}

class MultiPatternManager {
  private dataDir: string;
  private patterns: Map<string, MultiPattern>;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'multipatterns');
    this.patterns = new Map();
    this.loadPatterns();
  }

  /**
   * データディレクトリが存在するか確認し、なければ作成
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 保存されたパターンを読み込む
   */
  public loadPatterns(): number {
    this.patterns.clear();
    this.ensureDataDir();

    try {
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.dataDir, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const pattern = JSON.parse(data) as MultiPattern;
            
            const key = this.getPatternKey(pattern.name, pattern.guildId);
            this.patterns.set(key, pattern);
          } catch (error) {
            logger.error(`マルチパターンファイル ${file} の読み込みに失敗しました:`, error);
          }
        }
      }
      
      logger.info(`${this.patterns.size} 個のマルチパターンを読み込みました`);
      return this.patterns.size;
    } catch (error) {
      logger.error('マルチパターンの読み込み中にエラーが発生しました:', error);
      return 0;
    }
  }

  /**
   * パターンのキーを生成
   */
  private getPatternKey(name: string, guildId: string): string {
    return `${guildId}_${name}`;
  }

  /**
   * パターンを保存
   */
  public saveMultiPattern(pattern: MultiPattern): boolean {
    this.ensureDataDir();
    
    const key = this.getPatternKey(pattern.name, pattern.guildId);
    this.patterns.set(key, pattern);
    
    try {
      const filePath = path.join(this.dataDir, `${pattern.guildId}_${pattern.name.replace(/[^a-z0-9]/gi, '_')}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pattern, null, 2), 'utf8');
      logger.info(`マルチパターン ${pattern.name} を保存しました`);
      return true;
    } catch (error) {
      logger.error(`マルチパターン ${pattern.name} の保存に失敗しました:`, error);
      return false;
    }
  }

  /**
   * パターンを取得
   */
  public getMultiPattern(name: string, guildId: string): MultiPattern | null {
    const key = this.getPatternKey(name, guildId);
    return this.patterns.get(key) || null;
  }

  /**
   * パターンを削除
   */
  public deleteMultiPattern(name: string, guildId: string): boolean {
    const key = this.getPatternKey(name, guildId);
    const pattern = this.patterns.get(key);
    
    if (!pattern) {
      return false;
    }
    
    try {
      const filePath = path.join(this.dataDir, `${guildId}_${name.replace(/[^a-z0-9]/gi, '_')}.json`);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      this.patterns.delete(key);
      logger.info(`マルチパターン ${name} を削除しました`);
      return true;
    } catch (error) {
      logger.error(`マルチパターン ${name} の削除に失敗しました:`, error);
      return false;
    }
  }

  /**
   * ギルド内のすべてのパターンを取得
   */
  public getAllMultiPatterns(guildId: string): MultiPattern[] {
    const guildPatterns: MultiPattern[] = [];
    
    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.guildId === guildId) {
        guildPatterns.push(pattern);
      }
    }
    
    return guildPatterns;
  }
}

// シングルトンインスタンスをエクスポート
export const multipatternManager = new MultiPatternManager();
