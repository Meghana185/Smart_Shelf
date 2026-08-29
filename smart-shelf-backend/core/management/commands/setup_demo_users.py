from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import UserProfile


class Command(BaseCommand):
    help = 'Creates demo Admin and Staff user accounts for testing.'

    def handle(self, *args, **options):
        # 1. Admin User
        admin_user, created_admin = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@smartshelf.com',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('adminpass')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        admin_profile, _ = UserProfile.objects.get_or_create(user=admin_user)
        admin_profile.role = 'admin'
        admin_profile.save()

        if created_admin:
            self.stdout.write(self.style.SUCCESS("Successfully created Admin account (username: 'admin', password: 'adminpass')"))
        else:
            self.stdout.write(self.style.SUCCESS("Updated Admin account (username: 'admin', password: 'adminpass')"))

        # 2. Staff User
        staff_user, created_staff = User.objects.get_or_create(
            username='staff',
            defaults={
                'email': 'staff@smartshelf.com',
                'is_staff': False,
                'is_superuser': False,
            }
        )
        staff_user.set_password('staffpass')
        staff_user.is_staff = False
        staff_user.is_superuser = False
        staff_user.save()

        staff_profile, _ = UserProfile.objects.get_or_create(user=staff_user)
        staff_profile.role = 'staff'
        staff_profile.save()

        if created_staff:
            self.stdout.write(self.style.SUCCESS("Successfully created Staff account (username: 'staff', password: 'staffpass')"))
        else:
            self.stdout.write(self.style.SUCCESS("Updated Staff account (username: 'staff', password: 'staffpass')"))
