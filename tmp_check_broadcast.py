import requests, json

BASE = 'https://telemon.online'
API_KEY = 'sk-test-57812875e17c44e38b15c65a90eb7f47'

resp = requests.post(
    f'{BASE}/api/auth/login-with-api-key',
    json={'api_key': API_KEY},
    verify=False
)
token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# Check the previous broadcast
r = requests.get(f'{BASE}/api/broadcast/071e41d8-5c5c-41dd-a04b-70d048d2d3f8', headers=headers, verify=False)
print(f'Status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(json.dumps(data, indent=2, ensure_ascii=False)[:2000])
