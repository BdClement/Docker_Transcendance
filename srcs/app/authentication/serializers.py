import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth.password_validation import validate_password
from authentication.models import User

class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ['id', 'username', 'alias', 'email', 'nbPartiesJouees', 'nbVictoires', 'nbDefaites', 'photoProfile', 'languageFav']

class PublicUserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ['username', 'alias', 'nbPartiesJouees', 'nbVictoires', 'nbDefaites', 'photoProfile']

#Verification des données fournies lors de la connexions
# class LoginSerializer(serializers.Serializer):
# 	username = serializers.CharField(required=True)
# 	alias = serializers.CharField(required=True)
# 	password = serializers.CharField(write_only=True, required=True)

# 	def validate(self, data):
# 		username = data.get('username')
# 		alias = data.get('alias')
# 		password = data.get('password')

# 		User = get_user_model()
# 		try:
# 			user = User.objects.get(username=username, alias=alias)
# 		except User.DoesNotExist:
# 			raise serializers.ValidationError("Identifiant invalide.")

# 		if not user.check_password(password):
# 			raise serializers.ValidationError("Mot de passe invalide.")

# 		return {
# 			'user': user
# 		}

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        User = get_user_model()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError("Identifiant invalide.")

        if not user.check_password(password):
            raise serializers.ValidationError("Mot de passe invalide.")

        return {
            'user': user
        }

# verification des données fournies lors de l'inscription
# /!\ ajouter la photo de profil
class SignupSerializer(serializers.ModelSerializer):
	username = serializers.CharField(required=True)
	alias = serializers.CharField(required=True)
	email = serializers.EmailField(required=True)
	password = serializers.CharField(write_only=True, required=True)
	photoProfile = serializers.ImageField(required=False)
	# languageFav = serializers.IntegerField(required=False)
	languageFav = serializers.IntegerField(required=False)

	class Meta:
		model = get_user_model()
		fields = ['username', 'alias', 'email', 'password', 'photoProfile', 'languageFav']

	def validate_password(self, value):
		validate_password(value)
		return value

	def validate(self, data):
		username = data.get('username')
		alias = data.get('alias')
		email = data.get('email')
		password = data.get('password')
		language_fav = data.get('languageFav')
		user = get_user_model()
		print(f"Username: {username}, Email: {email}, Password: {password}")
		if user.objects.filter(email=email).exists():
			raise serializers.ValidationError("Cet email est deja utilisé.")
		if user.objects.filter(username=username).exists():
			raise serializers.ValidationError("Ce nom d'utilisateur est deja utilisé.")
		if user.objects.filter(alias=alias).exists():
			raise serializers.ValidationError("Cet alias est deja utilisé.")
		if len(password) < 8 or not re.search("[a-z]", password) or not re.search("[A-Z]", password) or not re.search("[0-9]", password) or not re.search("[.@,#$%^&+=!_\-]", password):
			raise serializers.ValidationError("Le mot de passe ne répond pas aux critères.")
		# Ajoute par Clement
		valid_choices = [1, 2, 3]
		if language_fav not in [None, ""] and language_fav not in valid_choices:
			raise serializers.ValidationError("La langue sélectionnée n'est pas valide.")

		return data

	def create(self, validated_data):
		password = validated_data.pop('password')
		# Ajoute par Clement
		if validated_data.get('languageFav') in [None, ""]:
			validated_data.pop('languageFav', None)
		user = get_user_model().objects.create(**validated_data)
		user.set_password(password)
		user.save()
		return user

class UserUpdateSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True, required=False)
	languageFav = serializers.CharField(required=False)

	# photoProfile = serializers.ImageField(required=False, allow_null=True)

	class Meta:
		model = User
		fields = ['username', 'alias', 'email', 'photoProfile', 'password', 'languageFav']
		extra_kwargs = {
            'username': {'required': False},
            'alias': {'required': False},
            'email': {'required': False},
            'password': {'write_only': True, 'required': False},
			'languageFav': {'required': False},
		}

	def validate_password(self, value):
		if value and (len(value) < 8 or not re.search("[a-z]", value) or not re.search("[A-Z]", value) or not re.search("[0-9]", value) or not re.search("[.@,#$%^&+=!_\-]", value)):
			raise serializers.ValidationError("Le mot de passe ne répond pas aux critères.")
		return value

	# Ajoute par Clement
	def validate_languageFav(self, value):
		language_map = {
			"English": 1,
			"Français": 2,
			"Tiếng Việt": 3,
		}
		valid_choices = [1, 2, 3]
		# if value not in [None, ""] and value not in valid_choices:
		if value not in [None, ""] and value not in language_map:
			raise serializers.ValidationError("La langue sélectionnée n'est pas valide.")
		return language_map[value]#Retourne la langue sous forme de texte


	def update(self, instance, validated_data):
		validated_data = {key: value for key, value in validated_data.items() if value not in ["", None]}
		password = validated_data.pop('password', None)
		# validated_data = {key: value for key, value in validated_data.items() if value not in ["", None]}
		for attr, value in validated_data.items():
			setattr(instance, attr, value)
		if password:
			self.validate_password(password)
			instance.set_password(password)
		instance.save()
		if password:
			login(self.context['request'], instance)
		return instance

