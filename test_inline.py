import sys; sys.path.insert(0,'.')
from app.main import app
routes=[(r.path, list(r.methods)) for r in app.routes if hasattr(r,'methods')]
for p,m in sorted(routes):
    print(f"{p} {m}")