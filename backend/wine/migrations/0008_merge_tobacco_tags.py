from django.db import migrations


def merge_tobacco_tags(apps, schema_editor):
    alias = schema_editor.connection.alias
    Tag = apps.get_model("wine", "Tag")
    WineReview = apps.get_model("wine", "WineReview")
    review_tags = WineReview.tags.through

    old_tag = Tag.objects.using(alias).filter(name="토바코").first()
    if old_tag is None:
        return

    new_tag, _ = Tag.objects.using(alias).get_or_create(
        name="담배향", defaults={"category": "oaky"}
    )
    review_ids = review_tags.objects.using(alias).filter(
        tag_id=old_tag.pk
    ).values_list("winereview_id", flat=True)
    review_tags.objects.using(alias).bulk_create(
        [review_tags(winereview_id=review_id, tag_id=new_tag.pk) for review_id in review_ids],
        ignore_conflicts=True,
    )
    old_tag.delete(using=alias)


class Migration(migrations.Migration):
    dependencies = [("wine", "0007_oaky_tobacco_tag")]

    operations = [
        migrations.RunPython(merge_tobacco_tags, migrations.RunPython.noop),
    ]
