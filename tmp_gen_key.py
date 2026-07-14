import hashlib, uuid
key = 'sk-test-' + uuid.uuid4().hex
key_hash = hashlib.sha256(key.encode()).hexdigest()
api_key_id = str(uuid.uuid4())
tenant_id = 'ca4d6942-3965-4a54-8063-f840036bd9e3'
print('key:' + key)
print('hash:' + key_hash)
print('id:' + api_key_id)
print('tenant:' + tenant_id)
