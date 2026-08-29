from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return 'admin'
    try:
        return user.userprofile.role
    except Exception:
        return None


class IsAdminRole(BasePermission):
    """
    Allows access only to authenticated users with 'admin' role (or superusers).
    """
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'admin'


class IsStaffRole(BasePermission):
    """
    Allows access only to authenticated users with 'staff' role.
    """
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'staff'


class IsCustomerRole(BasePermission):
    """
    Allows access only to authenticated users with 'customer' role.
    """
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'customer'



class IsAdminOrReadOnlyStaff(BasePermission):
    """
    Product & Category access control:
    - Admin: Full CRUD permissions (create, read, update, delete).
    - Staff: Read-only access (GET/HEAD/OPTIONS).
    """
    def has_permission(self, request, view):
        role = get_user_role(request.user)
        if not role:
            return False
        if request.method in SAFE_METHODS:
            return role in ('admin', 'staff')
        return role == 'admin'
