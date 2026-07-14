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

# Check message logs for the broadcast
r = requests.get(f'{BASE}/api/logs?broadcast_id=10a54ebc-eadc-4415-a296-db008efd919c', headers=headers, verify=False)
if r.status_code == 200:
    data = r.json()
    logs = data if isinstance(data, list) else data.get('logs', data.get('data', [data]))
    print('Logs:')
    for log in logs[:3]:
        print(json.dumps(log, indent=2, ensure_ascii=False)[:500])
elif r.status_code == 404:
    print('No logs route. Checking DB directly...')
else:
    print(f'{r.status_code}: {r.text[:300]}')
