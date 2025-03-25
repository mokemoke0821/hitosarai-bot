import { VoiceState } from 'discord.js';
import { moveHistoryPersist } from './moveHistoryPersist';

// 移動履歴を保存する型
interface MoveRecord {
  userId: string;
  username: string;
  sourceChannelId: string;
  sourceChannelName: string;
  targetChannelId: string;
  targetChannelName: string;
  timestamp: number;
}

// セッション情報
interface Session {
  id: string;
  userId: string;
  username: string;
  timestamp: number;
  records: MoveRecord[];
}

class MoveHistoryManager {
  // セッション履歴（最大10セッションまで保存）
  private sessions: Session[] = [];
  private lastSessionId: string = '';

  constructor() {
    // 保存されている履歴データを読み込む
    try {
      const savedData = moveHistoryPersist.loadHistory();
      if (savedData && savedData.sessions) {
        this.sessions = savedData.sessions;
        
        // 最新のセッションIDを設定
        if (this.sessions.length > 0) {
          const sortedSessions = [...this.sessions].sort((a, b) => b.timestamp - a.timestamp);
          this.lastSessionId = sortedSessions[0].id;
        }
      }
    } catch (error) {
      console.error('履歴データの読み込みに失敗しました:', error);
    }
  }

  /**
   * 新しい移動セッションを開始する
   * @param userId 実行したユーザーID
   * @param username 実行したユーザー名
   * @returns セッションID
   */
  startNewSession(userId: string, username: string): string {
    const sessionId = Date.now().toString();
    
    // 新しいセッションを作成
    const newSession: Session = {
      id: sessionId,
      userId,
      username,
      timestamp: Date.now(),
      records: []
    };
    
    // セッションリストに追加
    this.sessions.push(newSession);
    this.lastSessionId = sessionId;
    
    // セッション数が多すぎる場合、古いものから削除
    if (this.sessions.length > 10) {
      this.sessions.shift();
    }
    
    // 永続化
    this.persistSessions();
    
    return sessionId;
  }

  /**
   * 移動履歴をセッションに追加する
   * @param sessionId セッションID
   * @param record 移動記録
   */
  addMoveRecord(sessionId: string, record: MoveRecord): void {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.records.push(record);
      // 記録を追加したら永続化
      this.persistSessions();
    }
  }
  
  /**
   * セッションデータを永続化する
   */
  private persistSessions(): void {
    moveHistoryPersist.saveHistory({ sessions: this.sessions });
  }

  /**
   * 最後のセッションの移動履歴を取得する
   * @returns 最後のセッションの移動履歴、なければnull
   */
  getLastSessionRecords(): MoveRecord[] | null {
    const lastSession = this.sessions.find(s => s.id === this.lastSessionId);
    return lastSession ? lastSession.records : null;
  }

  /**
   * 最後のセッションを削除する
   */
  clearLastSession(): void {
    this.sessions = this.sessions.filter(s => s.id !== this.lastSessionId);
    
    // 次に新しいセッションを最後のセッションとして設定
    if (this.sessions.length > 0) {
      const sortedSessions = [...this.sessions].sort((a, b) => b.timestamp - a.timestamp);
      this.lastSessionId = sortedSessions[0].id;
    } else {
      this.lastSessionId = '';
    }
    
    // 変更を永続化
    this.persistSessions();
  }

  /**
   * ボイスステート変更イベントから移動を記録する
   * @param oldState 変更前のボイスステート
   * @param newState 変更後のボイスステート
   * @param sessionId セッションID
   */
  recordFromVoiceState(
    oldState: VoiceState,
    newState: VoiceState,
    sessionId: string
  ): void {
    // チャンネル移動の場合のみ記録
    if (oldState.channelId !== newState.channelId && oldState.channelId && newState.channelId) {
      this.addMoveRecord(sessionId, {
        userId: newState.member.id,
        username: newState.member.user.tag,
        sourceChannelId: oldState.channelId,
        sourceChannelName: oldState.channel?.name || '不明なチャンネル',
        targetChannelId: newState.channelId,
        targetChannelName: newState.channel?.name || '不明なチャンネル',
        timestamp: Date.now()
      });
    }
  }
}

// シングルトンインスタンスをエクスポート
export const moveHistory = new MoveHistoryManager();
