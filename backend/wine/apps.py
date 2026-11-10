from django.apps import AppConfig


class WineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "wine"

    def ready(self):
        from wine import signals  # noqa: F401
