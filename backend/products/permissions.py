from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allow access only to Django superusers."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_superuser)
