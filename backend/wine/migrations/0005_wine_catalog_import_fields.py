from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("wine", "0004_wine_bubble_avg_rating")]

    operations = [
        migrations.AddField(
            model_name="wine", name="catalog_visible",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name="wine", name="canonical_wine",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="legacy_wines", to="wine.wine",
            ),
        ),
        migrations.AddField(
            model_name="wine", name="search_aliases",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="wine", name="source_body",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="wine", name="source_sweetness",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="wine", name="source_acidity",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="wine", name="source_tannin",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
