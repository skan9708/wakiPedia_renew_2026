from django.db import migrations


def add_oaky_tobacco_tag(apps, schema_editor):
    Tag = apps.get_model("wine", "Tag")
    Tag.objects.using(schema_editor.connection.alias).update_or_create(
        name="담배향", defaults={"category": "oaky"}
    )


class Migration(migrations.Migration):
    dependencies = [("wine", "0006_alter_wine_type")]

    operations = [
        migrations.RunPython(add_oaky_tobacco_tag, migrations.RunPython.noop),
    ]
