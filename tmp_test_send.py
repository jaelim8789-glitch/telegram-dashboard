import urllib.request
import json
import uuid

BASE = 'http://localhost:8000'
TENANT_ID = 'ca4d6942-3965-4a54-8063-f840036bd9e3'
ACCOUNT_ID = 'e00f77b1-a75f-403d-9af4-d489940ee03f'

# Step 1: Create a user + api key via the phone verify flow
# Simulate phone verification
phone = '+1555' + str(uuid.uuid4()).replace('-', '')[:8]

print('Step 1: Send verification code to ' + phone)
data = json.dumps({"phone": phone}).encode()
req = urllib.request.Request(BASE + '/api/auth/phone/send-code', data=data, headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    print('  sent: ' + resp.read().decode()[:200])
except urllib.error.HTTPError as e:
    print('  error: ' + str(e.code) + ' ' + e.read().decode()[:200])

# Check the verification code from DB
import subprocess
result = subprocess.run([
    'docker', 'exec', 'backend-db-1', 'psql', '-U', 'telegram_dashboard', '-d', 'telegram_dashboard',
    '-c', "SELECT code FROM phone_verifications WHERE phone='" + phone + "' ORDER BY created_at DESC LIMIT 1;"
], capture_output=True, text=True, cwd='/')
lines = [l.strip() for l in result.stdout.split('\n') if l.strip() and l.strip() != 'code' and l.strip() != '--------' and '-' not in l.strip()]
if lines:
    code = lines[0]
    print('Step 2: Verify code ' + code)
    data2 = json.dumps({"phone": phone, "code": code}).encode()
    req2 = urllib.request.Request(BASE + '/api/auth/phone/verify', data=data2, headers={'Content-Type': 'application/json'})
    try:
        resp2 = urllib.request.urlopen(req2)
        result2 = json.loads(resp2.read().decode())
        print('  verified: ' + json.dumps(result2)[:200])
        api_key = result2.get('api_key') or result2.get('key')
        print('  API key: ' + str(api_key))
    except urllib.error.HTTPError as e:
        print('  error: ' + str(e.code) + ' ' + e.read().decode()[:300])
        api_key = None

    # Step 3: Login with API key
    if api_key:
        print('Step 3: Login with API key')
        data3 = json.dumps({"api_key": api_key}).encode()
        req3 = urllib.request.Request(BASE + '/api/auth/api-key', data=data3, headers={'Content-Type': 'application/json'})
        try:
            resp3 = urllib.request.urlopen(req3)
            token_data = json.loads(resp3.read().decode())
            token = token_data.get('access_token')
            print('  token: ' + str(token)[:40] + '...')
        except urllib.error.HTTPError as e:
            print('  error: ' + str(e.code) + ' ' + e.read().decode()[:200])
            token = None

        # Step 4: Send broadcast with inline buttons
        if token:
            print('Step 4: Send broadcast with inline buttons')
            boundary = '----TestBoundary' + str(uuid.uuid4()).replace('-', '')[:8]
            payload_parts = []
            payload_parts.append('--' + boundary)
            payload_parts.append('Content-Disposition: form-data; name="account_id"')
            payload_parts.append('')
            payload_parts.append(ACCOUNT_ID)
            payload_parts.append('--' + boundary)
            payload_parts.append('Content-Disposition: form-data; name="message"')
            payload_parts.append('')
            payload_parts.append('테스트 메시지 - 인라인 버튼 세로 1열 확인')
            payload_parts.append('--' + boundary)
            payload_parts.append('Content-Disposition: form-data; name="recipients"')
            payload_parts.append('')
            payload_parts.append('["self"]')
            payload_parts.append('--' + boundary)
            payload_parts.append('Content-Disposition: form-data; name="inline_buttons"')
            payload_parts.append('')
            inline_buttons = json.dumps([
                {"label": "\U0001f310 TELEMON 홈페이지 \U0001f517", "url": "https://telemon.app"},
                {"label": "\U0001f409 TELEMON 공식 채널 \U0001f517", "url": "https://t.me/telemon_channel"}
            ], ensure_ascii=False)
            payload_parts.append(inline_buttons)
            payload_parts.append('--' + boundary + '--')
            payload = '\r\n'.join(payload_parts).encode('utf-8')

            headers = {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'multipart/form-data; boundary=' + boundary
            }
            req4 = urllib.request.Request(BASE + '/api/broadcasts', data=payload, headers=headers, method='POST')
            try:
                resp4 = urllib.request.urlopen(req4)
                broadcast_result = json.loads(resp4.read().decode())
                print('  broadcast sent!')
                print('  result: ' + json.dumps(broadcast_result, indent=2, ensure_ascii=False)[:500])
            except urllib.error.HTTPError as e:
                print('  error: ' + str(e.code) + ' ' + e.read().decode()[:500])
else:
    print('Could not find verification code')
