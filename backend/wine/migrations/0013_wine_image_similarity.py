from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("wine", "0012_wineduplicatecandidate")]

    operations = [
        migrations.AddField(
            model_name="wine", name="image_hash",
            field=models.CharField(blank=True, db_index=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="wine", name="image_crop_hash",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="wine", name="image_color",
            field=models.CharField(blank=True, default="", max_length=6),
        ),
        migrations.AddField(
            model_name="wineduplicatecandidate", name="image_score",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
