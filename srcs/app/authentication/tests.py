from django.test import TestCase

# from django.urls import reverse_lazy, reverse
from rest_framework.test import APITestCase
from authentication.models import User
from rest_framework import status
from django.contrib.auth import get_user_model

# Create your tests here.

class UserAPITestCase(APITestCase):
    def setUp(self):
        self.signup_url = '/api/signup/' 
        self.user_info_url = '/api/user/' 
        self.user_update_url = '/api/userprofileupdate/'

        self.user_data = {
            'username': 'testuser',
            'email': 'testuser@example.com',
            'alias': 'Test Alias',
            'password': 'Securep@ssword123',
            # 'languageFav': '1' 
        }

    def test_signup_and_user_workflow(self):
        #Tester l'inscription
        response = self.client.post(self.signup_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['languageFav'], 2)

        # Vérifier que l'utilisateur est bien créé dans la base de données
        user_model = get_user_model()
        user = user_model.objects.get(username=self.user_data['username'])
        # self.assertEqual(user.languageFav, 1)
        self.assertEqual(user.languageFav, 2)

        # 2. Obtenir les informations utilisateur
        self.client.login(username=self.user_data['username'], password=self.user_data['password'])
        response = self.client.get(self.user_info_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['languageFav'], 'Français')

        # 3. Mettre à jour le champ languageFav
        # updated_data = {
        #     'languageFav': 'Français'  # Nouvelle valeur
        # }
        # response = self.client.put(self.user_update_url, updated_data)
        # self.assertEqual(response.status_code, status.HTTP_200_OK)
        # self.assertEqual(response.data['languageFav'], '2')
        updated_data = {
            'languageFav': 'English'  # Nouvelle valeur
            # 'username': 'testuser2'
        }

        response = self.client.put(self.user_update_url, updated_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['languageFav'], 1)

        response = self.client.get(self.user_update_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['languageFav'], '1')

        # Vérifie que la mise à jour est persistée
        user.refresh_from_db()
        self.assertEqual(user.languageFav, 1)
