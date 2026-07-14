import requests, json, uuid, time

BASE = 'https://telemon.online'
ACCOUNT_ID = 'e00f77b1-a75f-403d-9af4-d489940ee03f'
API_KEY = 'sk-test-57812875e17c44e38b15c65a90eb7f47'

resp = requests.post(f'{BASE}/api/auth/login-with-api-key', json={'api_key': API_KEY}, verify=False)
token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

time.sleep(45)

# Use requests library's built-in multipart handling
files = {}
data = {
    'account_id': ACCOUNT_ID,
    'message': 'Test inline buttons vertical layout',
    'recipients': '["self"]',
    'inline_buttons': json.dumps([
        {'label': 'TELEMON Homepage', 'url': 'https://telemon.app'},
        {'label': 'TELEMON Channel', 'url': 'https://t.me/telemon_channel'}
    ])
}

r = requests.post(f'{BASE}/api/broadcast', data=data, headers=headers, verify=False)
print(f'Status: {r.status_code}')
result = r.json()
print(json.dumps(result, indent=2, ensure_ascii=False))
bid = result.get('id')

if bid:
    for i in range(5):
        time.sleep(3)
        r2 = requests.get(f'{BASE}/api/broadcast/{bid}', headers=headers, verify=False)
        if r2.status_code == 200:
            d = r2.json()
            print(f'Check {i+1}: status={d.get("status")}, inline_buttons={d.get("inline_buttons")}')
            if d.get('status') in ('sent', 'failed'):
                break
