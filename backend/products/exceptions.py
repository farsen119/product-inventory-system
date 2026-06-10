import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('products')
error_logger = logging.getLogger('products')


def _request_context(context):
    request = context.get('request')
    if request is None and context.get('view'):
        request = getattr(context['view'], 'request', None)
    if not request:
        return 'path=unknown user=unknown'
    username = request.user.username if request.user.is_authenticated else 'anonymous'
    return f'path={request.path} user={username}'


def custom_exception_handler(exc, context):
    """Map Django validation and integrity errors to proper API responses."""
    ctx = _request_context(context)

    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            data = exc.message_dict
        elif hasattr(exc, 'messages'):
            data = {'detail': exc.messages}
        else:
            data = {'detail': str(exc)}
        logger.warning('Validation error | %s | data=%s', ctx, data)
        return Response(data, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, IntegrityError):
        logger.warning('Integrity error | %s | %s', ctx, exc)
        return Response(
            {'detail': 'Duplicate entry or constraint violation.'},
            status=status.HTTP_409_CONFLICT,
        )

    response = exception_handler(exc, context)
    if response is None:
        error_logger.exception('Unhandled API error | %s', ctx, exc_info=exc)
        return Response(
            {'detail': 'An unexpected server error occurred.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response.status_code >= 500:
        error_logger.exception('Server error | %s | status=%s', ctx, response.status_code, exc_info=exc)
    elif response.status_code == 404:
        logger.info('Not found | %s | status=404', ctx)
    elif response.status_code == 403:
        logger.warning('Permission denied | %s | status=403', ctx)

    return response
