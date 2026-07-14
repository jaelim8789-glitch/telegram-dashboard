import requests, json

BASE = 'https://telemon.online'
API_KEY = 'sk-test-57812875e17c44e38b15c65a90eb7f47'

resp = requests.post(f'{BASE}/api/auth/login-with-api-key', json={'api_key': API_KEY}, verify=False)
token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

r = requests.get(f'{BASE}/api/broadcast/54d1f3a2-2e45-4eb4-be3c-56dab8e90620', headers=headers, verify=False)
if r.status_code == 200:
    d = r.json()
    print('inline_buttons:', d.get('inline_buttons'))
    print(json.dumps(d, indent=2, ensure_ascii=False))
