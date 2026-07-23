#!/bin/bash
# npm run build 10회 연속 테스트
# 실패율을 확인하기 위한 스크립트

echo "10회 연속 빌드 테스트 시작..."
echo "시작 시간: $(date)"

SUCCESS_COUNT=0
FAIL_COUNT=0

for i in {1..10}; do
    echo "빌드 시도 #$i"
    
    # 빌드 실행
    if npm run build; then
        echo "빌드 #$i 성공"
        ((SUCCESS_COUNT++))
    else
        echo "빌드 #$i 실패"
        ((FAIL_COUNT++))
    fi
    
    # 잠시 대기
    sleep 2
done

echo "=== 테스트 결과 ==="
echo "총 시도: 10회"
echo "성공: $SUCCESS_COUNT회"
echo "실패: $FAIL_COUNT회"
echo "실패율: $((FAIL_COUNT * 10))%"

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ 모든 빌드가 성공적으로 완료되었습니다!"
else
    echo "⚠️ $FAIL_COUNT회 실패했습니다."
    exit 1
fi