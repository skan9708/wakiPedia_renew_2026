import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wakipedia.settings")
django.setup()

from user.models import User

if not User.objects.filter(email="admin@waki.kr").exists():
    User.objects.create_superuser(
        email="admin@waki.kr",
        password="admin1234",
        nickname="관리자",
        is_staff=True,
    )
    print("superuser created: admin@waki.kr / admin1234")
else:
    print("superuser already exists")
