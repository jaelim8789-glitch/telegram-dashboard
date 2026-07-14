import requests, json, uuid, time

BASE = 'https://telemon.online'
ACCOUNT_ID = 'e00f77b1-a75f-403d-9af4-d489940ee03f'
API_KEY = 'sk-test-57812875e17c44e38b15c65a90eb7f47'

resp = requests.post(
    f'{BASE}/api/auth/login-with-api-key',
    json={'api_key': API_KEY},
    verify=False
)
token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}
print('Logged in. Waiting for rate limit...')

# Wait for rate limit to pass
time.sleep(45)

boundary = '----Test' + uuid.uuid4().hex[:8]
body_parts = [
    f'--{boundary}',
    'Content-Disposition: form-data; name="account_id"',
    '',
    ACCOUNT_ID,
    f'--{boundary}',
    'Content-Disposition: form-data; name="message"',
    '',
    '테스트 - 인라인 버튼 세로 1열',
    f'--{boundary}',
    'Content-Disposition: form-data; name="recipients"',
    '',
    '["self"]',
    f'--{boundary}',
    'Content-Disposition: form-data; name="inline_buttons"',
    '',
    json.dumps([
        {'label': '🌐 TELEMON 홈페이지 ↗', 'url': 'https://telemon.app'},
        {'label': '🐉 TELEMON 공식 채널 ↗', 'url': 'https://t.me/telemon_channel'}
    ], ensure_ascii=False),
    f'--{boundary}--',
]
body = '\r\n'.join(body_parts)

r = requests.post(
    f'{BASE}/api/broadcast',
    data=body.encode('utf-8'),
    headers={**headers, 'Content-Type': f'multipart/form-data; boundary={boundary}'},
    verify=False
)
print(f'Broadcast: {r.status_code}')
result = r.json()
print(json.dumps(result, indent=2, ensure_ascii=False))
broadcast_id = result.get('id')

if broadcast_id:
    for i in range(15):
        time.sleep(3)
        r2 = requests.get(f'{BASE}/api/broadcast/{broadcast_id}', headers=headers, verify=False)
        if r2.status_code == 200:
            data = r2.json()
            status = data.get('status')
            print(f'Check {i+1}: status={status}')
            if status in ('sent', 'failed', 'partial'):
                print('Result:')
                print('  status:', status)
                print('  error:', data.get('error_message'))
                del data['message']
                print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])
                break
