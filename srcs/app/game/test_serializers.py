# from django.urls import reverse_lazy
from rest_framework.test import APITestCase

from .serializer import PlayCreateSerializer, PlayDetailSerializer
from .serializer import TournamentSerializer
from game.models import Play, Tournament

# from game.models import Play

class TestPlaySerializer(APITestCase):

	def test_serializer_valid(self):
		data = {'nb_players': 2, 'remote': True}
		serializer = PlayCreateSerializer(data=data)
		self.assertTrue(serializer.is_valid())

	def test_serializer_invalid(self):
		data = {'nb_players': 3, 'remote': 'yes'}
		serializer = PlayCreateSerializer(data=data)
		self.assertFalse(serializer.is_valid())
		self.assertIn('nb_players must be 2 or 4', serializer.errors['non_field_errors'])# erreur validation globale
		# print(f'Is valid: {serializer.is_valid()}')
		# print(f'Errors: {serializer.errors}')

	def test_serialization(self):
		data = {'nb_players': 2, 'remote': True}
		serializer = PlayCreateSerializer(data=data)
		self.assertTrue(serializer.is_valid())
		instance = serializer.save()
		self.assertEqual(instance.nb_players, data['nb_players'])
		self.assertEqual(instance.remote, data['remote'])

class TestPlayDetailSerializer(APITestCase):

	def setUp(self):
		self.play = Play.objects.create(nb_players=2, is_finished=False, results={})
		self.serializer = PlayDetailSerializer(instance=self.play)

	def test_serializer_valid(self):
		data = self.serializer.data
		self.assertEqual(set(data.keys()), {'nb_players', 'is_finished', 'results'})
		self.assertEqual(data['nb_players'], self.play.nb_players)
		self.assertEqual(data['is_finished'], self.play.is_finished)
		self.assertEqual(data['results'], self.play.results)
	# Si l'API permettait via ce serializer de creer ou modifier un objet Play, il faudrait tester la deserialisation

class TestTournamentSerializer(APITestCase):

	def setUp(self):
		self.tournament = Tournament.objects.create()

	def test_serializer_validation(self):
		serializer = TournamentSerializer(data={ 'nb_players': 4, 'alias_names': ['sami', 'samu', 'sama', 'samo']})
		self.assertTrue(serializer.is_valid())

	def test_serializer_invalid_data(self):
		serializer = TournamentSerializer(data={'alias_names': ['sami', 'samu', 'sama', 'samo']})
		self.assertFalse(serializer.is_valid())
		serializer = TournamentSerializer(data={ 'nb_players': 4})
		self.assertFalse(serializer.is_valid())
		serializer = TournamentSerializer(data={ 'nb_players': 4, 'alias_names': []})
		serializer.is_valid()# Pour pouvoir appeler seriallizer.errors
		self.assertIn('Alias_names number must match nb_players', str(serializer.errors))
		self.assertFalse(serializer.is_valid())

	def test_serialiazer_data(self):
		serializer = TournamentSerializer(self.tournament)
		self.assertEqual(serializer.data, {'nb_players': 4, 'is_finished': False, 'results':  None})

	def test_deserialization_valid_data(self):
		#Field requis
		data = {
			'nb_players': 4,
			'alias_names': ['sami', 'samu', 'sama', 'samo'],
		}
		serializer = TournamentSerializer(data=data)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		instance = serializer.save()
		self.assertEqual(instance.nb_players, 4)
		self.assertEqual(instance.is_finished, False)
		self.assertEqual(instance.results, None)

	def test_deserialization_invalid_data(self):
		#Field requis
		data = {
			'nb_players': 'Salut',
			'alias_names': ['sami', 'samu'],
		}
		serializer = TournamentSerializer(data=data)
		self.assertFalse(serializer.is_valid(), serializer.errors)
		self.assertIn('nb_players', serializer.errors)
