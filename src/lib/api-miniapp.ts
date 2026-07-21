import * as api from './api';
import type { Account, BroadcastStatus } from '@/types';

// ── 미니앱 전용 API 함수들 ──────────────────────────────────────────────────

export interface RecentBroadcast {
  id: string;
  message: string;
  status: BroadcastStatus;
  sentAt: string;
  recipients: number;
}

export async function fetchRecentBroadcasts(): Promise<RecentBroadcast[]> {
  try {
    // 최근 20개의 로그를 가져옴
    const logs = await api.fetchLogs({ days: 1 });
    
    // 최근 5개만 반환 (시간 순으로 정렬)
    return logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(log => ({
        id: log.id,
        message: log.message.length > 50 ? log.message.substring(0, 50) + '...' : log.message,
        status: log.status,
        sentAt: log.sentAt || log.createdAt,
        recipients: log.recipients.length
      }));
  } catch (error) {
    console.error('Failed to fetch recent broadcasts:', error);
    // 오류 발생 시 빈 배열 반환
    return [];
  }
}

// ── 토큰 잔액 조회 ──────────────────────────────────────────────────

export async function fetchTokenBalance(): Promise<number> {
  // 실제 API 엔드포인트가 존재하지 않기 때문에 더미 데이터 반환
  // 실제 구현 시에는 백엔드에 새로운 엔드포인트를 추가해야 함
  try {
    // 실제 API 호출 예시:
    // const response = await request<{ balance: number }>('/api/user/token-balance');
    // return response.balance;
    
    // 현재는 더미 값 반환
    return 1000;
  } catch (error) {
    console.error('Failed to fetch token balance:', error);
    return 0;
  }
}

// ── 계정 건강 상태 조회 ──────────────────────────────────────────────────

export async function fetchAccountHealthScore(accountId: string): Promise<number> {
  // 실제 API 엔드포인트가 존재하지 않기 때문에 더미 데이터 반환
  // 실제 구현 시에는 백엔드에 새로운 엔드포인트를 추가해야 함
  try {
    // 실제 API 호출 예시:
    // const response = await request<{ health_score: number }>(`/api/accounts/${accountId}/health-score`);
    // return response.health_score;
    
    // 현재는 더미 값 반환 (80-100 사이의 랜덤 값)
    return Math.floor(Math.random() * 21) + 80;
  } catch (error) {
    console.error('Failed to fetch account health score:', error);
    return 95; // 기본값
  }
}

// ── 계정별 상세 정보 조회 ──────────────────────────────────────────────────

export async function fetchAccountDetails(accountId: string): Promise<{
  healthScore: number;
  lastActive: string;
}> {
  try {
    const healthScore = await fetchAccountHealthScore(accountId);
    // 더미 데이터로 lastActive 시간 설정
    const now = new Date();
    const randomMinutesAgo = Math.floor(Math.random() * 60);
    now.setMinutes(now.getMinutes() - randomMinutesAgo);
    
    return {
      healthScore,
      lastActive: now.toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch account details:', error);
    return {
      healthScore: 95,
      lastActive: new Date().toISOString(),
    };
  }
}

// ── 빠른 발송 기능 ──────────────────────────────────────────────────

export async function quickSendToTopGroups(
  accountId: string, 
  message: string,
  groupLimit: number = 5
): Promise<{
  success: boolean;
  message: string;
  sentCount?: number;
}> {
  try {
    // 계정의 그룹 목록 가져오기
    const groups = await api.fetchGroups(accountId);
    
    // 상위 그룹 선택 (최대 groupLimit개)
    const selectedGroups = groups.slice(0, groupLimit);
    
    if (selectedGroups.length === 0) {
      return {
        success: false,
        message: '발송 가능한 그룹이 없습니다.'
      };
    }
    
    // 선택된 그룹에 메시지 발송
    const broadcast = await api.sendToGroup({
      accountId,
      message,
      groupIds: selectedGroups.map(g => g.id),
    });
    
    return {
      success: true,
      message: `${selectedGroups.length}개 그룹에 발송 완료!`,
      sentCount: selectedGroups.length
    };
  } catch (error) {
    console.error('Failed to quick send:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '발송에 실패했습니다.'
    };
  }
}