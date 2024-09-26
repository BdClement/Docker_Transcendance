from django.http import HttpResponse
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, MethodNotAllowed
from rest_framework.response import Response
from rest_framework import status, viewsets

from game.models import Play, Tournament
from game.serializer import PlayCreateSerializer, PlayDetailSerializer
from game.serializer import TournamentSerializer
# Create your views here.

def index(request):
	return render(request, 'game/index.html')

#APIView pour des actions specifiques
#ModelViewset pour les operations CRUD directement liee a un model

#Expose un endpoint pour creer une partie. L'ID de la partie cree peut etre utilise pour se connecter a la partie pour le client
#La ValidationError raise implique que DRF repond automatiquement une 400 Bad Request (Utile pour des erreurs de validation simple)
class PlayCreateAPIView(APIView):
	def post(self, request):
		# print("Request data:", request.data)
		#Pre validation pour eviter des operations plus couteuses si les fields requis ne sont pas present
		if 'remote' not in request.data or 'nb_players' not in request.data:
			raise ValidationError('remote and nb_players are required')

		#[ Autre option ] Extraire manuellement les donnees de la requete pour pouvoir creer un objet puis le mettre dans un serializer
		# remote = request.data.get('remote')
		#Recuperer les donnees depuis la requete directement grace au serializer pour simplifier la vue
		serializer = PlayCreateSerializer(data=request.data)
		if serializer.is_valid(raise_exception=True):
			serializer.save()
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		#Reponse BAD_REQUEST generee automatiquement dans la validation du serializer

#Ici on leve des exception relative a des acces externe comme la base de donnees ou les serializers (donc bloc try / except)
class PlayDetailAPIView(APIView):
	def get(self, request, *args, **kwargs):
		try:
			play_id = kwargs.get('play_id')
			play = Play.objects.get(pk=play_id)
		except Play.DoesNotExist:
			return Response({'error': 'Play object not found'}, status=status.HTTP_404_NOT_FOUND)
		except (ValueError, TypeError):
			return Response({'error': 'url required play_id'}, status=status.HTTP_400_BAD_REQUEST)
		except Exception as e:
			return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

		serializer = PlayDetailSerializer(play)
		return Response(serializer.data, status=status.HTTP_200_OK)

#Pour la creation et la lecture des donnees d'une partie, j'ai opte pour une separation des taches avec un serializer et une vue pour chaque tache
#Ce choix est viable si peu d'actions sont exposees, et permet de garder un controle total en limitant l'exposition d'actions non desirees
#Pour les Tournois, j'opte pour un viewSet avec actions limites ce qui permet de centraliser la logique et reduire la taille du code
class TournamentViewSet(viewsets.ModelViewSet):

	queryset = Tournament.objects.all()
	serializer_class = TournamentSerializer

	def list(self, request, *args, **kwargs):
		raise MethodNotAllowed('GET')

	def update(self, request, *args, **kwargs):
		raise MethodNotAllowed('PUT')

	def partial_update(self, request, *args, **kwargs):
		raise MethodNotAllowed('PATCH')

	def destroy(self, request, *args, **kwargs):
		raise MethodNotAllowed('DELETE')

	#Surcharge pour personnalisees les comportement sinon gerees par defaut par le viewset
	# def retrieve(self, request, *args, **kwargs):
	# 	return super().retrieve(request, *args, **kwargs)

	#Surcharge de create car j'utilise alias_names dans la logique metier et que ce field ne fait pas partie du model Tournament
	# def create(self, request, *args, **kwargs):
	# 	return super().create(request, *args, **kwargs)

	# Ajout de methodes personnalises si necessaire avec le decorateurs @action
	#methode pour recuperer la prochaine partie d'un tournoi
		#Checker si le tournoi existe
		#Aller chercher les partie liee a ce tournoi marquee comme is_finished=False pour le tour indique par Tournoi
		#renvoyer la partie en question avec les nom des joueurs
		#Si aucune partie liee a ce tournoi marquee comme is_finished=False pour le tour indique par Tournoi
		#Appel de tournament.create_next_round()
		#Check de reussite ou non en regardant si des parties sont  marquee comme is_finished=False pour le tour indique par Tournoi
		# ou si tournoi is_finished => renvoyer le nom du vainqueur avec un message de fin de tournoi
		# sinon renvoyer la partie disponible




# A conserver car peut-etre pour Remote_player je devrais cree un endpoint API permettant de start une partie ?
# class PlayStartAPIView(APIView):
# 	def post(self, request, id):
# 		try :
# 			play = Play.objects.get(id=id)
# 			#Recuperation de la socket cree par le Js
# 			#Lancement de la boucle Python du jeu
# 			# Thread / Celery / asyncio ?
# 			#(avec les mouvements communiquees via la websocket)
# 			return Response({"status": "Game started successfully"}, status=status.HTTP_200_OK)
# 		except Play.DoesNotExist:
# 			return Response({"error": "Play not found"}, status=status.HTTP_404_NOT_FOUND)


