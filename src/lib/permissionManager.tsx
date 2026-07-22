// 권한 관리 및 접근 제어 시스템
export enum Permission {
  READ_ACCOUNTS = 'read_accounts',
  WRITE_ACCOUNTS = 'write_accounts',
  SEND_MESSAGES = 'send_messages',
  READ_ANALYTICS = 'read_analytics',
  MANAGE_AUTOREPLY = 'manage_autoreply',
  MANAGE_TEMPLATES = 'manage_templates',
  ADMIN_ACCESS = 'admin_access',
}

export interface UserPermissions {
  userId: string;
  permissions: Permission[];
  accountId?: string; // 특정 계정에 대한 권한일 경우
  expiresAt?: number; // 만료 시간 (Unix timestamp)
}

class PermissionManager {
  private userPermissions: UserPermissions | null = null;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5분
  private lastChecked: number = 0;

  // 사용자 권한 설정
  setUserPermissions(permissions: UserPermissions) {
    this.userPermissions = permissions;
    this.lastChecked = Date.now();
  }

  // 권한 확인
  hasPermission(permission: Permission, accountId?: string): boolean {
    // 캐시 유효성 확인
    if (Date.now() - this.lastChecked > this.cacheTimeout) {
      return false; // 캐시가 만료되면 잠시 권한 없음으로 처리
    }

    if (!this.userPermissions) {
      return false;
    }

    // 만료 확인
    if (this.userPermissions.expiresAt && Date.now() > this.userPermissions.expiresAt) {
      this.clearPermissions();
      return false;
    }

    // 계정 관련 권한 확인
    if (accountId && this.userPermissions.accountId && accountId !== this.userPermissions.accountId) {
      return false;
    }

    return this.userPermissions.permissions.includes(permission);
  }

  // 여러 권한 확인 (AND 조건)
  hasAllPermissions(permissions: Permission[], accountId?: string): boolean {
    return permissions.every(permission => this.hasPermission(permission, accountId));
  }

  // 여러 권한 확인 (OR 조건)
  hasAnyPermission(permissions: Permission[], accountId?: string): boolean {
    return permissions.some(permission => this.hasPermission(permission, accountId));
  }

  // 권한 검증 후 실행
  async withPermission<T>(
    permission: Permission,
    action: () => Promise<T>,
    accountId?: string
  ): Promise<T> {
    if (!this.hasPermission(permission, accountId)) {
      throw new Error(`권한이 없습니다: ${permission}`);
    }

    try {
      return await action();
    } catch (error) {
      console.error(`권한이 있는 상태에서 작업 실패: ${permission}`, error);
      throw error;
    }
  }

  // 관리자 권한 확인
  isAdmin(): boolean {
    return this.hasPermission(Permission.ADMIN_ACCESS);
  }

  // 권한 갱신
  async refreshPermissions(): Promise<boolean> {
    try {
      // 실제 구현에서는 서버에서 권한 정보 가져오기
      // const response = await fetch('/api/auth/permissions');
      // const permissions = await response.json();
      // this.setUserPermissions(permissions);
      
      this.lastChecked = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  // 권한 초기화
  clearPermissions() {
    this.userPermissions = null;
    this.lastChecked = 0;
  }

  // 현재 사용자 권한 목록 가져오기
  getCurrentPermissions(): Permission[] {
    return this.userPermissions?.permissions || [];
  }
}

// 전역 인스턴스 생성
export const permissionManager = new PermissionManager();

// 권한 확인 HOC (Higher Order Component)
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>, 
  requiredPermission: Permission,
  accountId?: string
): React.FC<P> {
  return function WithPermission(props: P) {
    if (!permissionManager.hasPermission(requiredPermission, accountId)) {
      return (
        <div className="p-6 text-center text-gray-500">
          이 기능을 사용할 권한이 없습니다.
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}