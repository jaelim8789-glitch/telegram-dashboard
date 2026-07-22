#!/usr/bin/env python3
"""
Telegram Webhook 테스트를 위한 Ngrok 터널 스크립트
로컬에서 Telegram webhook 이벤트를 테스트할 수 있게 해줍니다.
"""
import os
import sys
import subprocess
import time
import requests
from typing import Dict, Any
import argparse


def check_ngrok_installed():
    """Ngrok가 설치되어 있는지 확인합니다."""
    try:
        result = subprocess.run(["ngrok", "--version"], 
                              capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def start_ngrok(port: int):
    """지정된 포트에 대해 ngrok 터널을 시작합니다."""
    print(f"🌐 Ngrok 터널을 포트 {port}에서 시작합니다...")
    
    try:
        # Ngrok 터널 시작
        ngrok_process = subprocess.Popen([
            "ngrok", "http", str(port),
            "--log", "stdout"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # 터널 URL을 얻기 위해 잠시 대기
        time.sleep(3)
        
        # 터널 정보 가져오기
        tunnels_url = "http://localhost:4040/api/tunnels"
        response = requests.get(tunnels_url)
        
        if response.status_code == 200:
            data = response.json()
            public_url = None
            for tunnel in data.get('tunnels', []):
                if tunnel.get('proto') == 'http':
                    public_url = tunnel.get('public_url')
                    break
                    
            if public_url:
                print(f"✅ Ngrok 터널이 생성되었습니다: {public_url}")
                print(f"🔧 Telegram Webhook 설정 명령:")
                print(f"curl -F \"url={public_url}/api/webhook/telegram\" https://api.telegram.org/bot<BOT_TOKEN>/setWebhook")
                return ngrok_process, public_url
            else:
                print("❌ 터널 URL을 가져올 수 없습니다.")
                return None, None
        else:
            print(f"❌ Ngrok API 응답 오류: {response.status_code}")
            return None, None
            
    except Exception as e:
        print(f"❌ Ngrok 시작 오류: {str(e)}")
        return None, None


def register_webhook(bot_token: str, webhook_url: str):
    """Telegram에 webhook을 등록합니다."""
    print(f"📡 Telegram에 Webhook 등록 시도: {webhook_url}")
    
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setWebhook",
            data={"url": webhook_url}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("ok"):
                print("✅ Webhook 등록 성공!")
                return True
            else:
                print(f"❌ Webhook 등록 실패: {result.get('description')}")
                return False
        else:
            print(f"❌ Webhook 등록 요청 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Webhook 등록 오류: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Telegram Webhook 테스트를 위한 Ngrok 터널')
    parser.add_argument('--port', type=int, default=8000, help='로컬 서버 포트 (기본값: 8000)')
    parser.add_argument('--bot-token', type=str, help='Telegram 봇 토큰 (선택)')
    parser.add_argument('--register-webhook', action='store_true', help='Webhook 자동 등록')
    
    args = parser.parse_args()
    
    # Ngrok 설치 확인
    if not check_ngrok_installed():
        print("❌ Ngrok가 설치되어 있지 않습니다.")
        print("다운로드: https://ngrok.com/download")
        print("설치 후 PATH에 추가해주세요.")
        sys.exit(1)
    
    # Ngrok 터널 시작
    process, public_url = start_ngrok(args.port)
    
    if not process:
        print("❌ Ngrok 터널 시작 실패")
        sys.exit(1)
    
    # Webhook 자동 등록
    if args.register_webhook and args.bot_token:
        register_webhook(args.bot_token, public_url)
    elif args.register_webhook and not args.bot_token:
        print("⚠️  --bot-token을 지정하지 않았습니다. Webhook 자동 등록을 건너뜁니다.")
    
    print("\n🔄 터널이 실행 중입니다. 종료하려면 Ctrl+C를 누르세요.")
    
    try:
        # 프로세스 유지
        process.wait()
    except KeyboardInterrupt:
        print("\n🛑 터널 종료 중...")
        process.terminate()
        process.wait()
        print("✅ 종료 완료")


if __name__ == "__main__":
    main()