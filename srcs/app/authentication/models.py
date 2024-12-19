from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class User(AbstractUser):
	alias = models.CharField(unique=True, max_length=50, null=True, blank=True)
	email = models.EmailField(unique=True)
	nbPartiesJouees = models.IntegerField(default=0, verbose_name='Nombre de parties jouées')
	nbVictoires = models.IntegerField(default=0, verbose_name='Nombre de parties gagnées')
	nbDefaites = models.IntegerField(default=0, verbose_name='Nombre de parties perdues')
	photoProfile = models.ImageField(verbose_name='Photo de profil', blank=True, null=True)
	following = models.ManyToManyField('self', related_name='followers', symmetrical=False)
	languageFav = models.IntegerField(choices=[(1, 'English'), (2, 'Français'), (3, 'Tiếng Việt')], default=2)
	ALIAS_FIELDS = 'alias'
	REQUIRED_FIELDS = ['email']
	USERNAME_FIELD = 'username'
	is_online = models.BooleanField(default=False)
	def __str__(self):
		return self.username
	# pass
