# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-auth.spec.ts >> 관리자 인증 >> 로그아웃하면 세션이 사라지고 다시 로그인 페이지로 이동한다
- Location: e2e\admin-auth.spec.ts:33:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTitle('로그아웃')
    - locator resolved to <button title="로그아웃" type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted transition-all">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    44 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - dialog "온보딩 1단계" [ref=e4]:
      - button "둘러보기 건너뛰기" [ref=e5]: ✕
      - generic [ref=e6]: 👤
      - heading "계정 관리" [level=2] [ref=e11]
      - paragraph [ref=e12]: Telegram 계정을 등록하고 상태를 모니터링하세요. 각 계정의 연결 상태, 세션 만료, 활동 내역을 한눈에 확인할 수 있습니다.
      - generic [ref=e13]:
        - button "건너뛰기" [ref=e14]
        - button "다음" [ref=e16] [cursor=pointer]
    - banner [ref=e17]:
      - link "TM TeleMon v2.0" [ref=e18] [cursor=pointer]:
        - /url: /app
        - generic [ref=e19]: TM
        - generic [ref=e20]:
          - generic [ref=e21]: TeleMon
          - generic [ref=e22]: v2.0
      - generic [ref=e23]:
        - generic [ref=e26]: Online
        - link "변경사항" [ref=e27] [cursor=pointer]:
          - /url: /changelog
          - img [ref=e28]
          - text: 변경사항
        - button "전체화면 (Alt+F)" [ref=e32]:
          - img [ref=e33]
        - button "테마 변경" [ref=e38]:
          - img [ref=e39]
        - link [ref=e41] [cursor=pointer]:
          - /url: /admin/dashboard
          - img [ref=e42]
        - button "로그아웃" [ref=e45]:
          - img [ref=e46]
    - generic [ref=e49]:
      - complementary "계정 목록" [ref=e50]:
        - complementary [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e54]: 계정 목록 (0)
            - generic [ref=e55]:
              - button "일괄 선택 모드" [ref=e56]:
                - img [ref=e57]
              - button "계정 새로고침" [ref=e60]:
                - img [ref=e61]
          - generic [ref=e67]:
            - img [ref=e69]
            - generic [ref=e74]:
              - paragraph [ref=e75]: 계정 없음
              - paragraph [ref=e76]: 계정 등록 탭에서 Telegram 계정을 추가하세요.
            - button "계정 등록" [ref=e78] [cursor=pointer]:
              - img [ref=e79]
              - text: 계정 등록
          - button "계정 그룹 만들기" [ref=e83]:
            - img [ref=e84]
            - text: 계정 그룹 만들기
          - paragraph [ref=e89]: 계정에 마우스를 올리면 삭제 가능
      - main [ref=e90]:
        - navigation "작업 영역 이동" [ref=e91]:
          - generic [ref=e92]:
            - group "일상 운영" [ref=e93]:
              - button "대시보드" [ref=e94]:
                - img [ref=e95]
                - generic [ref=e100]: 대시보드
              - button "발송" [ref=e102]:
                - img [ref=e103]
                - generic [ref=e106]: 발송
              - button "스케줄러" [ref=e107]:
                - img [ref=e108]
                - generic [ref=e112]: 스케줄러
              - button "로그" [ref=e113]:
                - img [ref=e114]
                - generic [ref=e117]: 로그
              - button "전달 분석" [ref=e118]:
                - img [ref=e119]
                - generic [ref=e121]: 전달 분석
              - button "계정 건강" [ref=e122]:
                - img [ref=e123]
                - generic [ref=e126]: 계정 건강
              - button "캠페인" [ref=e127]:
                - img [ref=e128]
                - generic [ref=e132]: 캠페인
              - button "AI Chat" [ref=e133]:
                - generic [ref=e134]: AI Chat
              - button "AI 답장" [ref=e135]:
                - generic [ref=e136]: AI 답장
              - button "AI 발송" [ref=e137]:
                - generic [ref=e138]: AI 발송
              - button "AI 리포트" [ref=e139]:
                - generic [ref=e140]: AI 리포트
              - button "AI 운영 센터" [ref=e141]:
                - generic [ref=e142]: AI 운영 센터
            - group "계정 및 자동화 관리" [ref=e144]:
              - button "계정 등록" [ref=e145]:
                - img [ref=e146]
                - generic [ref=e149]: 계정 등록
              - button "그룹" [ref=e150]:
                - img [ref=e151]
                - generic [ref=e156]: 그룹
              - button "그룹 검색" [ref=e157]:
                - img [ref=e158]
                - generic [ref=e161]: 그룹 검색
              - button "링크 검사" [ref=e162]:
                - img [ref=e163]
                - generic [ref=e170]: 링크 검사
              - button "자동 응답" [ref=e171]:
                - img [ref=e172]
                - generic [ref=e175]: 자동 응답
              - button "답장매크로" [ref=e176]:
                - img [ref=e177]
                - generic [ref=e179]: 답장매크로
              - button "폴더" [ref=e180]:
                - img [ref=e181]
                - generic [ref=e183]: 폴더
              - button "템플릿" [ref=e184]:
                - img [ref=e185]
                - generic [ref=e188]: 템플릿
              - button "채널 허브" [ref=e189]:
                - img [ref=e190]
                - generic [ref=e193]: 채널 허브
              - button "팀 관리" [ref=e194]:
                - img [ref=e195]
                - generic [ref=e207]: 팀 관리
              - button "프로필" [ref=e208]:
                - img [ref=e209]
                - generic [ref=e212]: 프로필
              - button "AI 사용량" [ref=e213]:
                - generic [ref=e214]: AI 사용량
        - generic [ref=e217]:
          - generic [ref=e218]:
            - generic [ref=e219]:
              - heading "운영 대시보드" [level=1] [ref=e221]
              - paragraph [ref=e222]: 실시간 운영 현황
            - generic [ref=e223]:
              - button "계정 추가" [ref=e224]:
                - img [ref=e225]
                - text: 계정 추가
              - button "새로고침" [ref=e226]:
                - img [ref=e227]
          - generic [ref=e232]:
            - generic [ref=e233]:
              - generic [ref=e234]:
                - img [ref=e235]
                - text: 발송 속도
              - generic [ref=e238]: 0/30일
              - generic [ref=e239]: 실패 없음
            - generic [ref=e240]:
              - generic [ref=e241]:
                - img [ref=e242]
                - text: 대기열
              - generic [ref=e245]: "0"
              - generic [ref=e246]: 대기 중 없음
            - generic [ref=e247]:
              - generic [ref=e248]:
                - img [ref=e249]
                - text: 성공률
              - generic [ref=e251]: "-"
              - generic [ref=e252]: 데이터 없음
            - generic [ref=e253]:
              - generic [ref=e254]:
                - img [ref=e255]
                - text: 계정 건강
              - generic [ref=e257]:
                - text: "0"
                - generic [ref=e258]: /0
              - generic [ref=e259]: 모든 계정 정상
            - generic [ref=e260]:
              - generic [ref=e261]:
                - img [ref=e262]
                - text: 반복 스케줄
              - generic [ref=e266]: "0"
              - generic [ref=e267]: 0개 활성
          - generic [ref=e268]:
            - generic [ref=e269]:
              - generic [ref=e270]:
                - img [ref=e271]
                - text: 정상 계정
              - generic [ref=e274]:
                - text: "0"
                - generic [ref=e275]: /0
            - generic [ref=e276]:
              - generic [ref=e277]:
                - img [ref=e278]
                - text: 주의 필요
              - generic [ref=e280]: "0"
            - generic [ref=e281]:
              - generic [ref=e282]:
                - img [ref=e283]
                - text: 발송
              - generic [ref=e285]: "0"
              - generic [ref=e286]: 실패 없음
            - generic [ref=e287]:
              - generic [ref=e288]:
                - img [ref=e289]
                - text: 반복
              - generic [ref=e294]: "0"
              - generic [ref=e295]: 정상
          - generic [ref=e296]:
            - generic [ref=e297]:
              - heading "사용량 추이" [level=3] [ref=e300]:
                - generic [ref=e301]:
                  - img [ref=e302]
                  - text: 사용량 추이
              - generic [ref=e306]:
                - img [ref=e308]
                - generic [ref=e311]:
                  - paragraph [ref=e312]: 사용량 데이터 없음
                  - paragraph [ref=e313]: 메시지를 발송하면 사용량 차트가 자동으로 생성됩니다.
            - generic [ref=e314]:
              - generic [ref=e316]:
                - heading "사용량 한도" [level=3] [ref=e317]:
                  - generic [ref=e318]:
                    - img [ref=e319]
                    - text: 사용량 한도
                - paragraph [ref=e321]: FREE
              - generic [ref=e323]:
                - generic [ref=e324]:
                  - generic [ref=e325]:
                    - generic [ref=e326]:
                      - img [ref=e327]
                      - generic [ref=e329]: 발송
                    - generic [ref=e330]:
                      - generic [ref=e331]: "0"
                      - generic [ref=e332]: / 100
                  - progressbar [ref=e334]
                - generic [ref=e335]:
                  - generic [ref=e336]:
                    - generic [ref=e337]:
                      - img [ref=e338]
                      - generic [ref=e341]: 자동 응답
                    - generic [ref=e342]:
                      - generic [ref=e343]: "0"
                      - generic [ref=e344]: / 100
                  - progressbar [ref=e346]
                - generic [ref=e347]:
                  - generic [ref=e348]:
                    - generic [ref=e349]:
                      - img [ref=e350]
                      - generic [ref=e355]: 계정
                    - generic [ref=e356]:
                      - generic [ref=e357]: "0"
                      - generic [ref=e358]: / 1
                  - progressbar [ref=e360]
                - generic [ref=e361]:
                  - generic [ref=e362]:
                    - generic [ref=e363]:
                      - img [ref=e364]
                      - generic [ref=e367]: AI 채팅
                    - generic [ref=e368]:
                      - generic [ref=e369]: "0"
                      - generic [ref=e370]: / 20
                  - progressbar [ref=e372]
                - generic [ref=e373]:
                  - paragraph [ref=e374]:
                    - img [ref=e375]
                    - text: Pro로 업그레이드
                  - paragraph [ref=e378]: 계정 10개, 월 50,000건 발송, 이미지 첨부 및 예약 발송 지원
          - button "위젯 설정" [ref=e380]:
            - img [ref=e381]
            - text: 위젯 설정
          - generic [ref=e384]:
            - button "새 발송" [ref=e385]:
              - img [ref=e386]
              - text: 새 발송
            - button "그룹 찾기" [ref=e387]:
              - img [ref=e388]
              - text: 그룹 찾기
            - button "반복 스케줄러" [ref=e393]:
              - img [ref=e394]
              - text: 반복 스케줄러
            - button "전달 분석" [ref=e397]:
              - img [ref=e398]
              - text: 전달 분석
            - button "발송 로그" [ref=e400]:
              - img [ref=e401]
              - text: 발송 로그
            - button "계정 관리" [ref=e403]:
              - img [ref=e404]
              - text: 계정 관리
          - generic [ref=e407]:
            - generic [ref=e408]:
              - heading "예약된 발송" [level=3] [ref=e411]:
                - generic [ref=e412]:
                  - img [ref=e413]
                  - text: 예약된 발송
              - generic [ref=e417]:
                - img [ref=e418]
                - paragraph [ref=e421]: 예약된 발송이 없습니다
            - generic [ref=e422]:
              - heading "반복 발송" [level=3] [ref=e425]:
                - generic [ref=e426]:
                  - img [ref=e427]
                  - text: 반복 발송
              - generic [ref=e433]:
                - img [ref=e434]
                - paragraph [ref=e439]: 반복 발송 일정이 없습니다
            - generic [ref=e440]:
              - heading "전달 건강" [level=3] [ref=e443]:
                - generic [ref=e444]:
                  - img [ref=e445]
                  - text: 전달 건강
              - generic [ref=e448]:
                - img [ref=e449]
                - paragraph [ref=e451]: 전달 데이터가 아직 없습니다
          - generic [ref=e452]:
            - heading "최근 활동" [level=3] [ref=e455]:
              - generic [ref=e456]:
                - img [ref=e457]
                - text: 최근 활동
            - generic [ref=e460]:
              - img [ref=e461]
              - paragraph [ref=e466]: 연결된 계정이 없습니다
              - paragraph [ref=e467]: 계정 등록 탭에서 새 계정을 추가하세요
          - generic [ref=e468]:
            - generic [ref=e470]:
              - heading "계정 현황" [level=3] [ref=e471]:
                - generic [ref=e472]:
                  - img [ref=e473]
                  - text: 계정 현황
              - paragraph [ref=e478]: 연결된 모든 Telegram 계정의 상태와 주요 지표
            - generic [ref=e480]:
              - img [ref=e481]
              - paragraph [ref=e486]: 연결된 계정이 없습니다
              - paragraph [ref=e487]: 계정 등록 탭에서 새 계정을 추가하세요
          - generic [ref=e488]:
            - img [ref=e489]
            - generic [ref=e491]: 계정 상태 정보를 불러올 수 없습니다.
            - button "다시 시도" [ref=e492]
      - complementary "인스펙터" [ref=e493]:
        - complementary [ref=e495]:
          - generic [ref=e496]:
            - text: 인스펙터
            - generic [ref=e497]: 대시보드
          - generic [ref=e500]:
            - heading "빠른 개요" [level=3] [ref=e503]
            - generic [ref=e505]:
              - generic [ref=e506]:
                - generic [ref=e507]:
                  - img [ref=e508]
                  - generic [ref=e513]: 전체 계정
                - generic [ref=e514]: "0"
              - generic [ref=e515]:
                - generic [ref=e516]:
                  - img [ref=e517]
                  - generic [ref=e519]: 활성 계정
                - generic [ref=e520]: "0"
              - generic [ref=e521]:
                - generic [ref=e522]:
                  - img [ref=e523]
                  - generic [ref=e525]: 자동 응답
                - generic [ref=e526]: "0"
              - generic [ref=e527]:
                - generic [ref=e528]:
                  - img [ref=e529]
                  - generic [ref=e531]: 오늘 발송
                - generic [ref=e532]: "0"
    - button "맨 위로":
      - img
    - generic [ref=e534]:
      - img [ref=e535]
      - generic [ref=e537]:
        - generic [ref=e538]: ⌘
        - generic [ref=e539]: K
        - generic [ref=e540]: 명령 팔레트
      - generic [ref=e541]:
        - generic [ref=e542]: "?"
        - generic [ref=e543]: 단축키 도움말
  - generic "Notifications"
  - alert [ref=e544]: Management Dashboard | TeleMon
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "123123";
  4  | const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "123456";
  5  | 
  6  | test.describe("관리자 인증", () => {
  7  |   test("로그인하지 않고 앱(/app)에 접속하면 로그인 페이지로 리다이렉트된다", async ({ page }) => {
  8  |     await page.goto("/app");
  9  |     await page.waitForURL(/\/admin\/login/);
  10 |     await expect(page.getByText("관리자 로그인")).toBeVisible();
  11 |   });
  12 | 
  13 |   test("잘못된 비밀번호로는 로그인에 실패한다", async ({ page }) => {
  14 |     await page.goto("/admin/login");
  15 |     await page.getByLabel("아이디").fill(ADMIN_USERNAME);
  16 |     await page.getByLabel("비밀번호").fill("완전히-틀린-비밀번호");
  17 |     await page.getByRole("button", { name: "로그인", exact: true }).click();
  18 | 
  19 |     await expect(page.getByText(/올바르지 않습니다/)).toBeVisible();
  20 |     await expect(page).toHaveURL(/\/admin\/login/);
  21 |   });
  22 | 
  23 |   test("올바른 자격증명으로 로그인하면 앱 대시보드로 이동한다", async ({ page }) => {
  24 |     await page.goto("/admin/login");
  25 |     await page.getByLabel("아이디").fill(ADMIN_USERNAME);
  26 |     await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  27 |     await page.getByRole("button", { name: "로그인", exact: true }).click();
  28 | 
  29 |     await page.waitForURL("/app");
  30 |     await expect(page.getByText(/^계정 목록 \(\d+\)$/)).toBeVisible();
  31 |   });
  32 | 
  33 |   test("로그아웃하면 세션이 사라지고 다시 로그인 페이지로 이동한다", async ({ page }) => {
  34 |     await page.goto("/admin/login");
  35 |     await page.getByLabel("아이디").fill(ADMIN_USERNAME);
  36 |     await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  37 |     await page.getByRole("button", { name: "로그인", exact: true }).click();
  38 |     await page.waitForURL("/app");
  39 | 
> 40 |     await page.getByTitle("로그아웃").click();
     |                                   ^ Error: locator.click: Test timeout of 30000ms exceeded.
  41 |     await page.waitForURL(/\/admin\/login/);
  42 | 
  43 |     await page.goto("/app");
  44 |     await page.waitForURL(/\/admin\/login/);
  45 |   });
  46 | });
  47 | 
```