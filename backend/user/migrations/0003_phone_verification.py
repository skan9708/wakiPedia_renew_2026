import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("user", "0002_initial")]

    operations = [
        migrations.AddField(
            model_name="user", name="phone_number",
            field=models.CharField(blank=True, max_length=11, null=True, unique=True, verbose_name="인증된 휴대폰 번호"),
        ),
        migrations.AddField(
            model_name="user", name="phone_verified_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="휴대폰 인증 시각"),
        ),
        migrations.AddField(
            model_name="user", name="phone_consent_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="휴대폰 번호 선택 수집 동의 시각"),
        ),
        migrations.AddField(
            model_name="user", name="auth_epoch",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="PhoneChallenge",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("purpose", models.CharField(max_length=20)),
                ("phone_number", models.CharField(max_length=11)),
                ("code_hash", models.CharField(max_length=64)),
                ("ip_hash", models.CharField(max_length=64)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="user.user")),
            ],
            options={"indexes": [models.Index(fields=["phone_number", "created_at"], name="user_phonec_phone_n_c0c847_idx"), models.Index(fields=["ip_hash", "created_at"], name="user_phonec_ip_hash_e11d74_idx")]},
        ),
        migrations.CreateModel(
            name="RecoveryRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(max_length=20)),
                ("subject_hash", models.CharField(max_length=64)),
                ("ip_hash", models.CharField(max_length=64)),
                ("actor_hash", models.CharField(blank=True, default="", max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"indexes": [models.Index(fields=["kind", "subject_hash", "created_at"], name="user_recove_kind_ba99cf_idx"), models.Index(fields=["kind", "ip_hash", "created_at"], name="user_recove_kind_8d0fca_idx"), models.Index(fields=["actor_hash", "created_at"], name="user_recove_actor_h_a1a601_idx")]},
        ),
    ]
