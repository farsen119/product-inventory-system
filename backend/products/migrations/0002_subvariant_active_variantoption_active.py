from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='subvariant',
            name='active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name='variantoption',
            name='active',
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
