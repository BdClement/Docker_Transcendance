from django.db import models
from channels.db import database_sync_to_async

# Create your models here.

# Pour reinitiliser les id des models lors des tests, dans un shell Django:
		# from django.db import connection
		# from yourapp.models import YourModel
		# with connection.cursor() as cursor:
		# cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{Play._meta.db_table}';")

# AJOUT DE LA DATE A FAIRE POUR MODULE D'ILONA
class Play(models.Model):
	#Liason de ce joueur a cette partie, ce joueur peut etre lier a plusieurs parties
	# player1 = models.ForeignKey(Player, on_delete=models.SET_NULL, related_name='player_1')
	player1 =  models.CharField(max_length=255, default='player1')
	player2 =  models.CharField(max_length=255, default='player2')
	player3 =  models.CharField(max_length=255, default='player3')
	player4 =  models.CharField(max_length=255, default='player4')
	#Lier la partie a un tournoi, la partie peut etre lier uniquemenr a ce tournoi
	# tournament = models.ForeignKey(Tournament, related_name='plays', on_delte=SET_NULL)
	#Pour indiquer l'ordre au sein d'un tournoi par tour
	# order_in_rounds = models.IntegerField(default=0)

	player_connected= models.PositiveIntegerField(default=0)#Nombre de joueurs connectes a la partie
	nb_players = models.IntegerField(choices=[(2, 'Deux joueurs'), (4, 'Quatre joueurs')], default=2)# Nombre de joueur = mode normal ou 2V2# Nombre de joueur = mode normal ou 2V2
	remote = models.BooleanField(default=False)# Remote ou pas

	#Choix de stocker les resultats dans un JSONField pour permettre une flexibilite au client en terme d'affchage
	#Possibilite de modifier le field sans toucher a la base de donnee
	results = models.JSONField(null=True, blank=True)
	is_finished = models.BooleanField(default=False)

	async def end_game(self, winners, losers, scores):
		#Mise a jour des statistiques de chaque joueur
		# Ou faire directemnt une fonciton dans la classe Player avec permissions necessaires qui fait cela
		# mais attention a l'acces a cette fonction qui permettrait de modifier les resultats d'un joueurs facilement
		# for winner in winners:
		# 	winner.victories += 1
		# 	winner.save()
		# for loser in losers:
		# 	loser.defeats += 1
		# 	loser.save()
		self.results = {
			# "winners": [winner.name for winner in winners],
			"winners": winners,# A modifier lorsque des objet Player seront attribuer a l'interieur de Play
			# "losers": [loser.name for loser in losers],
			"losers": losers,
			"score": scores
		}
		await database_sync_to_async(self.save)()

#Pour acceder aux parties dans un tournoi, utiliser l'attribut reverse genere automatiquement par Django grace au related_name
#Exemple ici tournament.plays.all()
class Tournament(models.Model):

	#Nombre joueur d'un tournoi flexible, soumis a des choix predefinis tout de meme
	nb_players = models.IntegerField(choices=[ (4, 'Quatre joueurs'), (8, 'Huit joueurs')], default=4)

	#Aller chercher dans la database grace aux alias les players concercne
	#Ajouter cela a au field players pour lier plusieurs player a ce tournoi (flexibilite du nombre de joueur au tournoi)
	# Acces au joueur d'un tournoi avec par exemple : tournament.players.all()

	# players = models.ManyToManyField(Player, related_name='tournaments_players')
	results = models.JSONField(null=True, blank=True)
	#winner = models.CharField(max_length=255, default='Tournament_in_progress')
	is_finished = models.BooleanField(default=False)

	#A partager avec les parties crees pour utiliser uniquement les parties concernee
	#order_round = models.PositiveIntegerField(default=0)

	#Fonction qui recupere les players encore en vie dans le tournoi et cree des parties de manieres aleatoire
	# def create_next_round(self):
		#incrementation de order_round
		# if self.order_round == 1:
			#Creation initial de partie a partir de players
		# else:# partie a creer a partir de parties du round precedent
			#Recuperer les gagnants du tour precedent
			#Si un seul gagnant du tour precedent alors c'est le vainqueur et on indique au client la fin du tournoi
			#Sinon creer des parties aleatoireement en incrementant le tour du tournoi





#Gestion d'une partie annulee = partie a rejouer car marque comme is_finished=False



