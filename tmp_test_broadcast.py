import urllib.request
import json

login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request('http://localhost:8000/api/auth/admin/login', data=login_data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
token_data = json.loads(resp.read().decode())
access_token = token_data.get('access_token', '')
print('Token: ' + access_token[:30] + '...')

req2 = urllib.request.Request('http://localhost:8000/api/telegram/accounts', headers={'Authorization': 'Bearer ' + access_token})
resp2 = urllib.request.urlopen(req2)
accounts = json.loads(resp2.read().decode())
print('Number of accounts: ' + str(len(accounts)))
for a in accounts[:2]:
    print('  - ' + str(a.get('phone', '?')) + ' (id=' + str(a.get('id', '?')) + ')')

# Pick first account and send a test broadcast with 2 inline buttons (vertical)
if accounts:
    account_id = accounts[0]['id']
    target = accounts[0].get('phone') or accounts[0].get('username')
    print('Sending to account: ' + str(account_id))

    import io
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = io.BytesIO()
    body.write(b'--' + boundary.encode() + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="account_id"\r\n\r\n')
    body.write(str(account_id).encode() + b'\r\n')
    body.write(b'--' + boundary.encode() + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="message"\r\n\r\n')
    body.write(b'Test message with vertical inline buttons\r\n')
    body.write(b'--' + boundary.encode() + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="recipients"\r\n\r\n')
    body.write(b'["' + target.encode() + b'"]\r\n')
    body.write(b'--' + boundary.encode() + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="inline_buttons"\r\n\r\n')
    inline_buttons = json.dumps([
        {"label": " TELEMON 홈페이지 ", "url": "https://telemon.app"},
        {"label": " TELEMON 공식 채널 ", "url": "https://t.me/telemon_channel"}
    ])
    body.write(inline_buttons.encode() + b'\r\n')
    body.write(b'--' + boundary.encode() + b'--\r\n')
    payload = body.getvalue()

    headers = {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'multipart/form-data; boundary=' + boundary
    }
    req3 = urllib.request.Request('http://localhost:8000/api/broadcasts', data=payload, headers=headers, method='POST')
    resp3 = urllib.request.urlopen(req3)
    result = json.loads(resp3.read().decode())
    print('Broadcast result: ' + json.dumps(result, indent=2)[:500])
