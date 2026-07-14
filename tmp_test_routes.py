import urllib.request
import json

routes = [
    '/api/auth/login',
    '/api/auth/admin/login',
    '/api/auth/token',
    '/api/admin/login',
    '/api/login',
]
for route in routes:
    try:
        data = json.dumps({"username": "admin", "password": "admin123"}).encode()
        req = urllib.request.Request('http://localhost:8000' + route, data=data, headers={'Content-Type': 'application/json'})
        resp = urllib.request.urlopen(req)
        body = resp.read().decode()
        print(route + ' -> ' + str(resp.status) + ' ' + body[:100])
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(route + ' -> ' + str(e.code) + ' ' + body[:100])
    except Exception as ex:
        print(route + ' -> ' + str(ex))
