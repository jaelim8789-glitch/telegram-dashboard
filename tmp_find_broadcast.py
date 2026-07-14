import requests, json, uuid

BASE = 'https://telemon.online'
API_KEY = 'sk-test-57812875e17c44e38b15c65a90eb7f47'

resp = requests.post(
    f'{BASE}/api/auth/login-with-api-key',
    json={'api_key': API_KEY},
    verify=False
)
print('Login:', resp.status_code)
token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# Find broadcast routes from frontend API code
potential_routes = [
    '/api/broadcasts',
    '/api/broadcast',
    '/api/send',
    '/api/messages',
    '/api/message',
    '/api/telegram/send',
]
for route in potential_routes:
    r = requests.get(BASE + route + '?limit=1', headers=headers, verify=False)
    if r.status_code != 404:
        print(f'{route}: {r.status_code}')
        if r.status_code == 200:
            print(r.text[:200])
            break

# Try POST on /api/broadcast (create one)
ACCOUNT_ID = 'e00f77b1-a75f-403d-9af4-d489940ee03f'
for route in ['/api/broadcasts', '/api/broadcast', '/api/send', '/api/messages', '/api/message', '/api/telegram/send']:
    boundary = '----Test' + uuid.uuid4().hex[:8]
    body_parts = [
        f'--{boundary}',
        'Content-Disposition: form-data; name="account_id"',
        '',
        ACCOUNT_ID,
        f'--{boundary}',
        'Content-Disposition: form-data; name="message"',
        '',
        'test',
        f'--{boundary}',
        'Content-Disposition: form-data; name="recipients"',
        '',
        '["self"]',
        f'--{boundary}--',
    ]
    body = '\r\n'.join(body_parts)
    r2 = requests.post(
        BASE + route,
        data=body.encode(),
        headers={**headers, 'Content-Type': f'multipart/form-data; boundary={boundary}'},
        verify=False
    )
    if r2.status_code != 404:
        print(f'POST {route}: {r2.status_code} {r2.text[:200]}')
        if r2.status_code == 200 or r2.status_code == 201:
            print('SUCCESS')
            break
    else:
        print(f'POST {route}: 404')
