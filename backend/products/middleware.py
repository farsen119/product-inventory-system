import logging
import time

logger = logging.getLogger('products.api')


class APILoggingMiddleware:
    """Log all API requests with method, path, user, status, and duration."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - start) * 1000

        username = '-'
        if hasattr(request, 'user') and request.user.is_authenticated:
            username = request.user.username

        logger.info(
            '%s %s | user=%s | status=%s | %.2fms',
            request.method,
            request.path,
            username,
            response.status_code,
            duration_ms,
        )
        return response
