# Generated by Django 4.1.5 on 2023-01-27 06:03

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0005_rename_finish_channel_1_labeling_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='channel_1',
            name='labeling',
        ),
        migrations.RemoveField(
            model_name='channel_2',
            name='labeling',
        ),
        migrations.RemoveField(
            model_name='channel_3',
            name='labeling',
        ),
        migrations.RemoveField(
            model_name='channel_4',
            name='labeling',
        ),
    ]
