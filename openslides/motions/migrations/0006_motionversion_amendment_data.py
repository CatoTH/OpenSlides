# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2018-03-07 10:46
from __future__ import unicode_literals

import jsonfield.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('motions', '0005_auto_20180202_1318'),
    ]

    operations = [
        migrations.AddField(
            model_name='motionversion',
            name='amendment_paragraphs',
            field=jsonfield.fields.JSONField(null=True),
        ),
    ]
