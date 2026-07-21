import sys, os
sys.path.insert(0, '..')
os.environ['ADMIN_DB_PATH'] = 'test_debug.db'

from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.routers import free_api_key as fak_module
import importlib
importlib.reload(fak_module)

app = FastAPI()
app.include_router(fak_module.router, prefix='/api')
client = TestClient(app)

resp = client.post('/api/free-api-key/start')
print('start:', resp.status_code, resp.json())

data = resp.json()
token = data['token']
fak_module._upsert_request(token, status='verified', reason=None)

check_resp = client.post('/api/telegram-verify/check', json={'token': token})
print('check:', check_resp.status_code, check_resp.json())

issue_resp = client.post('/api/free-api-key/issue', json={'token': token, 'phone': '+821000000001'})
print('issue:', issue_resp.status_code, issue_resp.json())
