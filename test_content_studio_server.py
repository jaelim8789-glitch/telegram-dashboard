"""
Standalone test server for AI Content Studio API.
Run this to test the content studio endpoints without the full backend stack.
"""

from fastapi import FastAPI
from app.api.content_studio import router

app = FastAPI(title="Content Studio Test Server")
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8999)