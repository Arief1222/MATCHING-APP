from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Group, Permission, User

@receiver(post_migrate)
def setup_roles(sender, **kwargs):

    # ========== Superadmin Group ==========
    superadmin_group, _ = Group.objects.get_or_create(name='superadmin')
    
    # Ambil semua permission yang ada
    all_permissions = Permission.objects.all()
    
    # Berikan semua permission ke grup superadmin
    superadmin_group.permissions.set(all_permissions)

    # ========== Grup Lain (Opsional) ==========
    employee_group, _ = Group.objects.get_or_create(name='employee')
    employee_permissions = Permission.objects.filter(
        codename__in=[
            'add_completedtask', 'change_completedtask', 'delete_completedtask', 'view_completedtask',
            'view_task',
            'add_datatable', 'change_datatable', 'delete_datatable', 'view_datatable',
            'add_labelingdata', 'change_labelingdata', 'delete_labelingdata', 'view_labelingdata',
            'add_matchingresult', 'change_matchingresult', 'delete_matchingresult', 'view_matchingresult',
            'add_matchingjob', 'change_matchingjob', 'delete_matchingjob', 'view_matchingjob',
        ]
    )
    employee_group.permissions.set(employee_permissions)

    kepala_group, _ = Group.objects.get_or_create(name='kepala_bps')
    kepala_permissions = Permission.objects.filter(
        codename__in=['view_user', 'view_completedtask', 'view_task',
                      'view_datatable', 'view_labelingdata', 'view_matchingresult', 'view_matchingjob']
    )
    kepala_group.permissions.set(kepala_permissions)

    # ========== Buat User Superadmin Default ==========
    if not User.objects.filter(username='superadmin').exists():
        user = User.objects.create_superuser(
            username='superadmin',
            email='superadmin@example.com',
            password='admin123'
        )
        user.groups.add(superadmin_group)
