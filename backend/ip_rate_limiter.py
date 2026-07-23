"""
IP-based rate limiter middleware for FastAPI.
Enforces per-IP request limits from production_config RateLimitConfig.
"""
import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class IPRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(("/metrics", "/health")):
            return await call_next(request)
        
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        bucket = self._buckets[ip]
        bucket[:] = [t for t in bucket if now - t < self.window_seconds]
        
        if len(bucket) >= self.max_requests:
            logger.warning("Rate limit exceeded for IP: %s", ip)
            raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
        
        bucket.append(now)
        return await call_next(request)
