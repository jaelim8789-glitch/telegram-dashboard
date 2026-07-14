export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-sm text-app-text-secondary leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제1조 (개인정보의 수집 및 이용 목적)</h2>
        <p>
          TeleMon은 회원가입, 서비스 제공, 고객 지원을 위해 필요한 최소한의 개인정보를 수집하며,
          수집된 정보는 다음의 목적 이외로는 사용되지 않습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>서비스 가입 및 이용: 전화번호 인증, 계정 관리</li>
          <li>API 키 발급 및 관리: 서비스 이용 자격 확인</li>
          <li>결제 처리: 유료 요금제 결제 검증</li>
          <li>고객 지원: 문의사항 처리 및 서비스 개선</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제2조 (수집하는 개인정보 항목)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>필수 항목:</strong> 전화번호, Telegram 사용자 ID</li>
          <li><strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, API 호출 기록</li>
          <li><strong>결제 정보:</strong> 결제 참조 번호(payment_ref), 암호화폐 거래 정보 (지갑 주소 등)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제3조 (개인정보의 보유 및 이용기간)</h2>
        <p>
          회원 탈퇴 시까지 개인정보를 보유·이용하며, 탈퇴 후에는 관련 법령에 따라
          일정 기간 보관 후 안전하게 파기합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>계약 또는 청약철회에 관한 기록: 5년</li>
          <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년</li>
          <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
          <li>서비스 이용 기록(로그): 1년</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제4조 (개인정보의 파기)</h2>
        <p>
          개인정보 보유기간이 경과하거나 처리목적이 달성된 경우, 지체 없이 해당 개인정보를 파기합니다.
          전자적 파일 형태의 정보는 기술적 방법을 사용하여 복구 불가능한 방법으로 삭제합니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제5조 (개인정보의 제3자 제공)</h2>
        <p>
          회사는 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만, 관계 법령에 의거하거나
          회원의 사전 동의가 있는 경우에 한하여 예외적으로 제공할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제6조 (개인정보 보호 조치)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>API 키 암호화:</strong> API 키는 SHA-256 해시로 저장되어 원본 복원이 불가능합니다.</li>
          <li><strong>접근 통제:</strong> 개인정보에 대한 접근 권한을 최소화하고 관리합니다.</li>
          <li><strong>통신 암호화:</strong> 모든 API 요청은 HTTPS를 통해 암호화되어 전송됩니다.</li>
          <li><strong>로그 보호:</strong> 접속 기록은 암호화된 형태로 안전하게 보관됩니다.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제7조 (회원의 권리)</h2>
        <p>
          회원은 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제를 요청할 수 있으며,
          회사는 이에 대해 지체 없이 조치합니다. 회원 탈퇴 시 모든 개인정보는
          관련 법령에 따른 보관 기간 이후 안전하게 파기됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">제8조 (개인정보보호 책임자)</h2>
        <p>개인정보보호 책임자: Kilo</p>
        <p>이메일: support@telemon.io</p>
        <p>Telegram: @telemon_support</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-app-text mb-3">시행일자</h2>
        <p>본 개인정보처리방침은 2025년 7월 1일부터 시행합니다.</p>
      </section>
    </div>
  );
}
