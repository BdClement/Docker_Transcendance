# Generated by Django 5.1 on 2024-09-10 17:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0003_remove_play_clients_connected'),
    ]

    operations = [
        migrations.AddField(
            model_name='play',
            name='is_finished',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='play',
            name='results',
            field=models.JSONField(blank=True, null=True),
        ),
    ]