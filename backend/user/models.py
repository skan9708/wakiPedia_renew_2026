from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser

from wakipedia.models import BaseModel


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **kwargs):
        if not email:
            raise ValueError("이메일은 필수입니다.")
        email = self.normalize_email(email)
        user = self.model(email=email, **kwargs)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **kwargs):
        kwargs.setdefault("is_staff", True)
        kwargs.setdefault("nickname", "관리자")
        return self.create_user(email, password, **kwargs)


class User(BaseModel, AbstractBaseUser):
    email = models.EmailField("이메일", unique=True)
    nickname = models.CharField("닉네임", max_length=50)
    avatar = models.ImageField("프로필 이미지", upload_to="avatars/", null=True, blank=True)

    kakao_id = models.CharField("카카오 아이디", max_length=255, unique=True, null=True, blank=True)
    favorite_wines = models.ManyToManyField("wine.Wine", related_name="favorite_users", blank=True)

    is_active = models.BooleanField("계정 활성화 여부", default=True)
    is_staff = models.BooleanField("admin 여부", default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, perm, obj=None):
        return True

    def __str__(self):
        return f"{self.email} ({self.nickname})"
