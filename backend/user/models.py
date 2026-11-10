from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser
import uuid

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
    phone_number = models.CharField("인증된 휴대폰 번호", max_length=11, unique=True, null=True, blank=True)
    phone_verified_at = models.DateTimeField("휴대폰 인증 시각", null=True, blank=True)
    phone_consent_at = models.DateTimeField("휴대폰 번호 선택 수집 동의 시각", null=True, blank=True)
    email_verified_at = models.DateTimeField("이메일 인증 시각", null=True, blank=True)
    auth_epoch = models.PositiveIntegerField(default=0)
    favorite_wines = models.ManyToManyField("wine.Wine", related_name="favorite_users", blank=True)

    is_active = models.BooleanField("계정 활성화 여부", default=True)
    is_staff = models.BooleanField("admin 여부", default=False)
    is_import_account = models.BooleanField("여러 사람의 리뷰를 모은 계정", default=False)

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


class PhoneChallenge(models.Model):
    PURPOSE_LINK = "link"
    PURPOSE_FIND_EMAIL = "find_email"
    PURPOSE_SIGNUP = "signup"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purpose = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=11)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    code_hash = models.CharField(max_length=64)
    ip_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["phone_number", "created_at"]),
            models.Index(fields=["ip_hash", "created_at"]),
        ]


class SignupEmailChallenge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    code_hash = models.CharField(max_length=64)
    ip_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_hash", "created_at"]),
        ]


class RecoveryRequest(models.Model):
    kind = models.CharField(max_length=20)
    subject_hash = models.CharField(max_length=64)
    ip_hash = models.CharField(max_length=64)
    actor_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["kind", "subject_hash", "created_at"]),
            models.Index(fields=["kind", "ip_hash", "created_at"]),
            models.Index(fields=["actor_hash", "created_at"]),
        ]
