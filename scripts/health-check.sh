#!/bin/bash

echo "=== Health Check ==="

# curl localhost/health (서버가 실행 중일 경우에만 확인)
echo "서버 상태 확인:"
if command -v curl >/dev/null 2>&1; then
    curl -s localhost/health || echo "서버가 실행 중이 아니거나 localhost/health 엔드포인트가 없습니다."
else
    echo "curl 명령어가 설치되지 않았습니다."
fi

# docker ps --format
echo -e "\nDocker 컨테이너 상태:"
if command -v docker >/dev/null 2>&1; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "docker 명령어가 설치되지 않았습니다."
fi

# 디스크 사용량 확인
echo -e "\n디스크 사용량:"
if command -v df >/dev/null 2>&1; then
    disk_usage=$(df -h | grep -E '^([A-Za-z]:|/)' | awk '{print $5}' | sed 's/%//' | sort -nr | head -1)
    if [ "$disk_usage" -gt 80 ]; then
        echo "WARNING: 디스크 사용량이 ${disk_usage}%로 80%를 초과합니다."
    else
        echo "디스크 사용량: ${disk_usage}% (정상 범위)"
    fi
else
    echo "df 명령어가 설치되지 않았습니다."
fi

# 메모리 사용량 확인
echo -e "\n메모리 사용량:"
if command -v free >/dev/null 2>&1; then
    available_memory=$(free -h | awk 'NR==2{print $7}' | sed 's/G//')
    if [[ $(echo "$available_memory < 0.5" | bc -l 2>/dev/null || echo "0.1") == "1" ]]; then
        echo "WARNING: 사용 가능한 메모리가 ${available_memory}GB로 500MB 미만입니다."
    else
        echo "사용 가능한 메모리: ${available_memory}GB (정상 범위)"
    fi
else
    echo "free 명령어가 설치되지 않았습니다."
fi

echo "=== Health Check 완료 ==="