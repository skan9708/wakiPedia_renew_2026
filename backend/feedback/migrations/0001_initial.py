from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Feedback",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.CharField(choices=[("bug", "불편한 점"), ("idea", "원하는 기능"), ("other", "기타 의견")], max_length=10)),
                ("message", models.TextField()),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("status", models.CharField(choices=[("new", "새 피드백"), ("handled", "확인 완료")], default="new", max_length=10)),
                ("handled_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
