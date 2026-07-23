import { jwtVerify } from 'jose';

// 테넌트 격리 클래스
export class TenantIsolation {
  private static readonly JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev_only'
  );

  // 테넌트 ID 추출 및 검증
  static async extractTenantId(token: string): Promise<string | null> {
    try {
      const verified = await jwtVerify(token, this.JWT_SECRET);
      const tenantId = verified.payload.tenantId as string;
      
      if (!tenantId) {
        throw new Error('Missing tenant ID in token');
      }
      
      return tenantId;
    } catch (error) {
      console.error('JWT 토큰 검증 실패:', error);
      return null;
    }
  }

  // 테넌트 소유권 검증
  static async verifyTenantOwnership(
    token: string, 
    resourceId: string, 
    resourceType: 'account' | 'broadcast' | 'auto_reply' | 'log'
  ): Promise<boolean> {
    try {
      const tenantId = await this.extractTenantId(token);
      if (!tenantId) {
        return false;
      }

      // 실제 DB 쿼리를 통해 테넌트 소유권 확인
      // 이 부분은 실제 구현 시 백엔드 API를 호출하거나 DB 직접 연결
      const ownsResource = await this.checkResourceOwnership(tenantId, resourceId, resourceType);
      
      return ownsResource;
    } catch (error) {
      console.error('테넌트 소유권 검증 실패:', error);
      return false;
    }
  }

  // 실제 소유권 확인 (모의 구현)
  private static async checkResourceOwnership(
    tenantId: string, 
    resourceId: string, 
    resourceType: string
  ): Promise<boolean> {
    // 실제 구현에서는 DB 쿼리를 통해 테넌트 ID와 리소스 ID 매칭 확인
    console.log(`Checking ownership: tenant=${tenantId}, resource=${resourceId}, type=${resourceType}`);
    
    // 테스트용으로 true 반환 (실제 구현 시 DB 쿼리 필요)
    return true;
  }

  // 테넌트 간 데이터 접근 차단 미들웨어
  static async enforceTenantIsolation(
    req: any, 
    res: any, 
    next: () => void
  ): Promise<void> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const resourceId = req.params.id || req.query.id;
    const resourceType = req.path.split('/')[1]; // URL 경로에서 리소스 타입 추출

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (resourceId) {
      const hasAccess = await this.verifyTenantOwnership(token, resourceId, resourceType as any);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied: Insufficient permissions' });
        return;
      }
    }

    next();
  }

  // 테넌트별 쿼리 필터 생성
  static createTenantFilter(tenantId: string) {
    return {
      where: {
        tenant_id: tenantId
      }
    };
  }
}

// 테넌트 격리 미들웨어
export function tenantIsolationMiddleware(handler: Function) {
  return async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tenantId = await TenantIsolation.extractTenantId(token);
    if (!tenantId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 요청에 테넌트 ID 추가
    req.tenantId = tenantId;

    return handler(req, res);
  };
}