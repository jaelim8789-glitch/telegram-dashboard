#!/bin/bash

# TeleMon 시스템 진단 스크립트
# 8가지 주요 항목을 한 번에 검사

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== TeleMon 시스템 진단 시작 ==="
echo

results=()

# 도구 존재 여부 확인 함수
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${YELLOW}WARN${NC}: $1 명령어를 찾을 수 없습니다"
        return 1
    fi
    return 0
}

# 1. DNS: app.telemon.online → 실제 VPS IP 일치 여부 확인
echo "1. DNS 일치성 검사 중..."
if check_command dig && check_command curl; then
    expected_ip=$(dig +short app.telemon.online | head -n1)
    actual_vps_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null)
    
    if [ -z "$expected_ip" ]; then
        echo -e "${RED}FAIL${NC}: DNS 레코드를 조회할 수 없습니다"
        results+=("DNS: FAIL - Cannot resolve app.telemon.online")
    elif [ -z "$actual_vps_ip" ]; then
        echo -e "${RED}FAIL${NC}: 실제 VPS IP를 확인할 수 없습니다"
        results+=("DNS: FAIL - Cannot determine actual VPS IP")
    elif [ "$expected_ip" == "$actual_vps_ip" ]; then
        echo -e "${GREEN}PASS${NC}: DNS 레코드가 VPS IP($actual_vps_ip)와 일치합니다"
        results+=("DNS: PASS")
    else
        echo -e "${RED}FAIL${NC}: DNS 레코드($expected_ip)가 VPS IP($actual_vps_ip)와 불일치"
        results+=("DNS: FAIL - Expected: $expected_ip, Actual: $actual_vps_ip")
    fi
else
    echo -e "${YELLOW}INFO${NC}: dig 또는 curl 명령어가 설치되지 않아 DNS 검사를 건너뜁니다"
    results+=("DNS: INFO - dig or curl not available")
fi
echo

# 2. Nginx: CSP 헤더, CORS 헤더, OPTIONS 처리 확인
echo "2. Nginx 보안 헤더 및 CORS 설정 검사 중..."
if check_command curl; then
    nginx_csp=$(curl -s -I https://app.telemon.online 2>/dev/null | grep -i "content-security-policy" || echo "not found")
    nginx_access_control=$(curl -s -I https://app.telemon.online 2>/dev/null | grep -i "access-control-allow-origin" || echo "not found")

    has_csp=false
    has_cors=false

    if [[ "$nginx_csp" != "not found" ]]; then
        has_csp=true
    fi

    if [[ "$nginx_access_control" != "not found" ]]; then
        has_cors=true
    fi

    # OPTIONS 요청 테스트
    options_response=$(curl -s -X OPTIONS -I https://app.telemon.online 2>/dev/null | grep -i "access-control-allow-methods" || echo "not found")
    has_options_handling=false
    if [[ "$options_response" != "not found" ]]; then
        has_options_handling=true
    fi

    if $has_csp && $has_cors && $has_options_handling; then
        echo -e "${GREEN}PASS${NC}: Nginx에서 CSP, CORS, OPTIONS 모두 올바르게 구성됨"
        echo "  CSP 헤더 존재: $has_csp"
        echo "  CORS 헤더 존재: $has_cors"
        echo "  OPTIONS 요청 처리: $has_options_handling"
        results+=("Nginx: PASS")
    elif $has_csp && $has_cors; then
        echo -e "${YELLOW}WARN${NC}: Nginx에서 CSP 및 CORS는 구성되었으나 OPTIONS 처리 미흡"
        echo "  CSP 헤더 존재: $has_csp"
        echo "  CORS 헤더 존재: $has_cors"
        echo "  OPTIONS 요청 처리: $has_options_handling"
        results+=("Nginx: WARN - Missing proper OPTIONS handling")
    else
        echo -e "${RED}FAIL${NC}: Nginx 설정 미비"
        echo "  CSP 헤더 존재: $has_csp"
        echo "  CORS 헤더 존재: $has_cors"
        echo "  OPTIONS 요청 처리: $has_options_handling"
        results+=("Nginx: FAIL - CSP: $has_csp, CORS: $has_cors, OPTIONS: $has_options_handling")
    fi
else
    echo -e "${YELLOW}INFO${NC}: curl 명령어가 설치되지 않아 Nginx 검사를 건너뜁니다"
    results+=("Nginx: INFO - curl not available")
fi
echo

# 3. FastAPI: CORSMiddleware 설정, api/health 응답 확인
echo "3. FastAPI CORSMiddleware 및 health 엔드포인트 검사 중..."
if check_command curl; then
    api_health_response=$(curl -s https://api.telemon.online/api/health 2>/dev/null || echo "failed")
    if [[ "$api_health_response" != "failed" ]] && [[ -n "$api_health_response" ]]; then
        # JSON 파싱 가능한지 확인
        if echo "$api_health_response" | jq empty 2>/dev/null; then
            health_status=$(echo "$api_health_response" | jq -r '.status // empty')
            if [[ "$health_status" == "ok" ]] || [[ "$health_status" == "healthy" ]]; then
                echo -e "${GREEN}PASS${NC}: API health 엔드포인트 정상 응답"
                
                # CORS 헤더 확인
                cors_header=$(curl -s -I -H "Origin: https://app.telemon.online" https://api.telemon.online/api/health 2>/dev/null | grep -i "access-control-allow-origin" || echo "not found")
                if [[ "$cors_header" != "not found" ]]; then
                    echo -e "${GREEN}PASS${NC}: API에서 CORS 헤더 제공"
                    results+=("FastAPI: PASS")
                else
                    echo -e "${YELLOW}WARN${NC}: API에서 CORS 헤더 누락"
                    results+=("FastAPI: WARN - Missing CORS headers")
                fi
            else
                echo -e "${RED}FAIL${NC}: API health 엔드포인트가 비정상 상태 반환"
                echo "  응답: $api_health_response"
                results+=("FastAPI: FAIL - Health status not ok")
            fi
        else
            echo -e "${RED}FAIL${NC}: API health 엔드포인트가 유효한 JSON을 반환하지 않음"
            echo "  응답: $api_health_response"
            results+=("FastAPI: FAIL - Invalid JSON response")
        fi
    else
        echo -e "${RED}FAIL${NC}: API health 엔드포인트 접근 실패"
        results+=("FastAPI: FAIL - Cannot reach health endpoint")
    fi
else
    echo -e "${YELLOW}INFO${NC}: curl 명령어가 설치되지 않아 FastAPI 검사를 건너뜁니다"
    results+=("FastAPI: INFO - curl not available")
fi
echo

# 4. Cloudflare: 캐시 상태, SSL 모드 확인
echo "4. Cloudflare 설정 검사 중..."
if check_command curl; then
    cf_ray=$(curl -s -I https://app.telemon.online 2>/dev/null | grep -i "cf-ray" || echo "not found")
    ssl_protocol=$(curl -s -I https://app.telemon.online 2>/dev/null | grep -i "strict-transport-security" || echo "not found")
    cf_cache_status=$(curl -s -I https://app.telemon.online 2>/dev/null | grep -i "cf-cache-status" || echo "not found")

    if [[ "$cf_ray" != "not found" ]]; then
        if [[ "$ssl_protocol" != "not found" ]]; then
            echo -e "${GREEN}PASS${NC}: Cloudflare를 통한 요청 처리, SSL 구성 확인됨"
            if [[ "$cf_cache_status" != "not found" ]]; then
                cache_status=$(echo "$cf_cache_status" | cut -d' ' -f2)
                echo "  Cloudflare 캐시 상태: $cache_status"
            fi
            results+=("Cloudflare: PASS")
        else
            echo -e "${YELLOW}WARN${NC}: Cloudflare는 활성화되었으나 SSL 구성 미비"
            results+=("Cloudflare: WARN - SSL not properly configured")
        fi
    else
        echo -e "${YELLOW}WARN${NC}: Cloudflare를 통한 요청이 감지되지 않음"
        results+=("Cloudflare: WARN - Not properly routing through Cloudflare")
    fi
else
    echo -e "${YELLOW}INFO${NC}: curl 명령어가 설치되지 않아 Cloudflare 검사를 건너뜁니다"
    results+=("Cloudflare: INFO - curl not available")
fi
echo

# 5. Docker: frontend/backend 이미지 커밋 = master 최신 커밋 여부 확인
echo "5. Docker 이미지 커밋 일치성 검사 중..."
if command -v docker >/dev/null 2>&1; then
    frontend_container=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -i frontend | head -n1 || echo "none")
    backend_container=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -i backend | head -n1 || echo "none")
    
    frontend_running=false
    backend_running=false
    
    if [[ "$frontend_container" != "none" ]]; then
        frontend_image=$(echo "$frontend_container" | awk '{print $2}')
        echo "  Frontend 컨테이너: $(echo "$frontend_container" | awk '{print $1}')"
        echo "  Frontend 이미지: $frontend_image"
        frontend_running=true
    fi
    
    if [[ "$backend_container" != "none" ]]; then
        backend_image=$(echo "$backend_container" | awk '{print $2}')
        echo "  Backend 컨테이너: $(echo "$backend_container" | awk '{print $1}')"
        echo "  Backend 이미지: $backend_image"
        backend_running=true
    fi
    
    if $frontend_running || $backend_running; then
        # 현재 Git 저장소에서 HEAD 커밋 해시 가져오기
        if [ -d ".git" ]; then
            current_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
            
            if [[ "$current_commit" != "unknown" ]]; then
                # 이미지 태그에 커밋 해시가 포함되어 있는지 확인
                frontend_match=true
                backend_match=true
                
                if $frontend_running && [[ "$frontend_image" != *"$current_commit"* ]]; then
                    frontend_match=false
                fi
                
                if $backend_running && [[ "$backend_image" != *"$current_commit"* ]]; then
                    backend_match=false
                fi
                
                if $frontend_match && $backend_match; then
                    echo -e "${GREEN}PASS${NC}: Docker 이미지가 현재 커밋과 일치"
                    results+=("Docker: PASS")
                else
                    echo -e "${YELLOW}WARN${NC}: Docker 이미지 커밋 해시가 현재 커밋과 불일치"
                    echo "  현재 커밋: $current_commit"
                    if ! $frontend_match; then
                        echo "  Frontend 이미지에 현재 커밋 포함되지 않음"
                    fi
                    if ! $backend_match; then
                        echo "  Backend 이미지에 현재 커밋 포함되지 않음"
                    fi
                    results+=("Docker: WARN - Image commit mismatch")
                fi
            else
                echo -e "${YELLOW}INFO${NC}: 로컬 Git 저장소에서 커밋 정보를 가져올 수 없음"
                results+=("Docker: INFO - Cannot determine local commit")
            fi
        else
            echo -e "${YELLOW}INFO${NC}: .git 디렉토리가 존재하지 않음"
            results+=("Docker: INFO - Not a git repository")
        fi
    else
        echo -e "${YELLOW}WARN${NC}: Frontend 또는 Backend Docker 컨테이너가 실행 중이 아님"
        results+=("Docker: WARN - No frontend/backend containers running")
    fi
else
    echo -e "${YELLOW}INFO${NC}: Docker 명령어를 사용할 수 없음"
    results+=("Docker: INFO - Docker not available")
fi
echo

# 6. Git: VPS 배포된 커밋 = origin/master 여부 확인
echo "6. Git 배포 커밋 일치성 검사 중..."
if [ -d ".git" ]; then
    if check_command git; then
        local_commit=$(git rev-parse HEAD 2>/dev/null)
        remote_commit=$(git ls-remote origin HEAD 2>/dev/null | cut -f1)
        
        if [ -n "$local_commit" ] && [ -n "$remote_commit" ]; then
            if [ "$local_commit" = "$remote_commit" ]; then
                echo -e "${GREEN}PASS${NC}: 로컬 커밋이 원격 저장소와 동기화됨"
                results+=("Git: PASS")
            else
                echo -e "${YELLOW}WARN${NC}: 로컬 커밋이 원격 저장소와 다름"
                echo "  로컬: ${local_commit:0:7}"
                echo "  원격: ${remote_commit:0:7}"
                results+=("Git: WARN - Local commit differs from remote")
            fi
        else
            echo -e "${RED}FAIL${NC}: Git 커밋 정보를 가져올 수 없습니다"
            results+=("Git: FAIL - Cannot fetch commit info")
        fi
    else
        echo -e "${YELLOW}INFO${NC}: Git 명령어가 설치되지 않음"
        results+=("Git: INFO - Git not available")
    fi
else
    echo -e "${YELLOW}INFO${NC}: .git 디렉토리가 존재하지 않음"
    results+=("Git: INFO - Not a git repository")
fi
echo

# 7. Telegram: tg-widget 번들 포함 여부 확인
echo "7. Telegram 웹 위젯 번들 포함 여부 검사 중..."
if check_command curl; then
    # 다양한 Telegram 관련 스크립트 로드 방식 확인
    tg_content=$(curl -s https://app.telemon.online 2>/dev/null || echo "failed")
    
    if [[ "$tg_content" != "failed" ]]; then
        # 여러 가능한 Telegram 관련 스크립트 이름 확인
        has_tg_widget=false
        if echo "$tg_content" | grep -qi "telegram-web-app\|telegram\.org\/js\/telegram-widget\.js\|@tma\.js"; then
            has_tg_widget=true
        fi
        
        if $has_tg_widget; then
            echo -e "${GREEN}PASS${NC}: Telegram 웹 위젯이 프론트엔드 번들에 포함됨"
            results+=("Telegram: PASS")
        else
            echo -e "${YELLOW}WARN${NC}: Telegram 웹 위젯이 프론트엔드 번들에 포함되지 않음"
            results+=("Telegram: WARN - Telegram widget not found in bundle")
        fi
    else
        echo -e "${YELLOW}WARN${NC}: 웹사이트 콘텐츠를 가져올 수 없음"
        results+=("Telegram: WARN - Cannot fetch website content")
    fi
else
    echo -e "${YELLOW}INFO${NC}: curl 명령어가 설치되지 않아 Telegram 검사를 건너뜁니다"
    results+=("Telegram: INFO - curl not available")
fi
echo

# 8. Env: NEXT_PUBLIC_* build-args 정상 여부 확인
echo "8. 환경 변수 build-args 검사 중..."
if command -v docker >/dev/null 2>&1; then
    # 현재 실행 중인 프론트엔드 컨테이너에서 환경변수 확인
    frontend_container=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -i frontend | awk '{print $1}' || echo "none")
    
    if [[ "$frontend_container" != "none" ]]; then
        env_vars=$(docker exec "$frontend_container" env 2>/dev/null | grep NEXT_PUBLIC_ || echo "not found")
        
        if [[ "$env_vars" != "not found" ]]; then
            echo -e "${GREEN}PASS${NC}: NEXT_PUBLIC_* 환경변수가 컨테이너 내에 존재함"
            
            # 중요한 NEXT_PUBLIC_* 변수들이 실제로 사용 가능한지 확인
            required_vars=("NEXT_PUBLIC_API_BASE_URL" "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME")
            missing_vars=()
            
            for var in "${required_vars[@]}"; do
                if ! echo "$env_vars" | grep -q "^$var="; then
                    missing_vars+=("$var")
                fi
            done
            
            if [ ${#missing_vars[@]} -eq 0 ]; then
                results+=("Env: PASS")
            else
                echo -e "${YELLOW}WARN${NC}: 필수 NEXT_PUBLIC_* 변수 일부 누락:"
                for var in "${missing_vars[@]}"; do
                    echo "  - $var"
                done
                results+=("Env: WARN - Missing required NEXT_PUBLIC_ vars: ${missing_vars[*]}")
            fi
        else
            echo -e "${YELLOW}WARN${NC}: NEXT_PUBLIC_* 환경변수가 컨테이너 내에 존재하지 않음"
            results+=("Env: WARN - NEXT_PUBLIC_ vars not found in container")
        fi
    else
        echo -e "${YELLOW}INFO${NC}: 실행 중인 프론트엔드 컨테이너 없음"
        results+=("Env: INFO - No frontend container running")
    fi
else
    echo -e "${YELLOW}INFO${NC}: Docker 명령어를 사용할 수 없음"
    results+=("Env: INFO - Docker not available")
fi
echo

echo "=== 진단 결과 요약 ==="
for result in "${results[@]}"; do
    if [[ "$result" =~ PASS$ ]]; then
        echo -e "${GREEN}$result${NC}"
    elif [[ "$result" =~ WARN$ ]]; then
        echo -e "${YELLOW}$result${NC}"
    else
        echo -e "${RED}$result${NC}"
    fi
done

# 결과 요약 통계
pass_count=0
warn_count=0
fail_count=0
info_count=0

for result in "${results[@]}"; do
    if [[ "$result" =~ PASS$ ]]; then
        ((pass_count++))
    elif [[ "$result" =~ WARN$ ]]; then
        ((warn_count++))
    elif [[ "$result" =~ FAIL$ ]]; then
        ((fail_count++))
    else
        ((info_count++))
    fi
done

echo
echo "=== 통계 ==="
echo -e "${GREEN}PASS:${NC} $pass_count"
echo -e "${YELLOW}WARN:${NC} $warn_count"
echo -e "${RED}FAIL:${NC} $fail_count"
echo -e "${BLUE}INFO:${NC} $info_count"

echo
echo "=== 완료 ==="