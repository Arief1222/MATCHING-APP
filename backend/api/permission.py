from rest_framework.permissions import BasePermission

class IsSuperadmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name='superadmin').exists()

class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name='employee').exists()

class IsKepalaBPS(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.groups.filter(name='kepala_bps').exists()

class IsSuperadminOrKepalaBpsReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        is_superadmin = request.user.groups.filter(name='superadmin').exists()
        is_kepala_bps = request.user.groups.filter(name='kepala_bps').exists()

        if request.method == 'GET' and is_kepala_bps:
            return True  # kepala bps hanya boleh GET
        return is_superadmin  # superadmin boleh semua method