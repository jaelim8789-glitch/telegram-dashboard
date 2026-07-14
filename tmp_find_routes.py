import requests, json
r = requests.get('https://localhost/openapi.json', verify=False)
paths = list(r.json().get('paths', {}).keys())
for p in paths:
    if 'auth' in p.lower() or 'apikey' in p.lower():
        print(p)
