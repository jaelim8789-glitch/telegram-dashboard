import requests, json, time
r = requests.post('https://telemon.online/api/auth/login-with-api-key', json={'api_key': 'sk-test-57812875e17c44e38b15c65a90eb7f47'}, verify=False)
print(r.status_code, r.text[:300])
if r.status_code == 200:
    token = r.json().get('access_token')
    headers = {'Authorization': 'Bearer ' + str(token)}

    time.sleep(5)
    data = {
        'account_id': 'e00f77b1-a75f-403d-9af4-d489940ee03f',
        'message': 'Test inline buttons vertical layout v2',
        'recipients': '["self"]',
        'inline_buttons': json.dumps([
            {'label': 'TELEMON Homepage', 'url': 'https://telemon.app'},
            {'label': 'TELEMON Channel', 'url': 'https://t.me/telemon_channel'}
        ])
    }
    r2 = requests.post('https://telemon.online/api/broadcast', data=data, headers=headers, verify=False)
    print('Broadcast:', r2.status_code, r2.text[:500])
    bid = r2.json().get('id')
    if bid:
        for i in range(5):
            time.sleep(3)
            r3 = requests.get('https://telemon.online/api/broadcast/' + bid, headers=headers, verify=False)
            if r3.status_code == 200:
                d = r3.json()
                print('Check', i+1, 'status:', d.get('status'), 'inline_buttons:', d.get('inline_buttons'))
                if d.get('status') in ('sent', 'failed'):
                    break
