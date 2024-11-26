import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from asgiref.sync import sync_to_async
from .models import Message
from authentication.models import User
from django.db.models import Q
from channels.db import database_sync_to_async
import sys
import asyncio

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.user = self.scope["user"]
		if self.user.is_authenticated:
			self.user_group_name = f"user_{self.user.id}"
			self.user.onlineStatus = True
			await database_sync_to_async(self.user.save)()
			await self.channel_layer.group_add(self.user_group_name, self.channel_name)
			await self.accept()
		else:
			await self.close()

	async def disconnect(self, close_code):
		if self.user.is_authenticated:
			self.user.onlineStatus = False
			await database_sync_to_async(self.user.save)()
			await self.channel_layer.group_discard(self.user_group_name, self.channel_name)
			
	async def receive(self, text_data):
		data = json.loads(text_data)
		event_type = data.get("type")
		destinataire_id = data.get("destinataire_id")

		try:
			destinataire = await sync_to_async(User.objects.get)(id=destinataire_id)
		except User.DoesNotExist:
			await self.send(text_data=json.dumps({"error": "Destinataire non trouvé"}))
			return
		
		if event_type == "send_message":
			await self.handle_send_message(data, destinataire)
		elif event_type == "pong_invitation":
			await self.handle_pong_invitation(destinataire)
		elif event_type == "block_user":
			block_type = data.get("block_type")
			await self.handle_block_user(destinataire, block_type)
		elif event_type == "pong_invitation_annulation":
			await self.handle_pong_invitation_annulation(data, destinataire)
		elif event_type == "pong_invitation_refuse":
			await self.handle_pong_invitation_refuse(data, destinataire)
		else:
			await self.send(text_data=json.dumps({"error": "Type d'événement inconnu"}))

	async def handle_send_message(self, data, destinataire):
		style = "message"
		message_text = data.get("message")
		
		# Étape 1: Chercher ou créer la conversation
		conversation = await sync_to_async(Conversation.objects.filter(
			(Q(user_1=self.user) & Q(user_2=destinataire)) |
			(Q(user_1=destinataire) & Q(user_2=self.user))
		).first)()
		
		if not conversation:
			conversation = await sync_to_async(Conversation.objects.create)(
				user_1=self.user, user_2=destinataire
			)

		# Étape 2: Enregistrer le message
		message_obj = await sync_to_async(Message.objects.create)(
			style=style, expediteur=self.user, destinataire=destinataire,
			message=message_text, conversation=conversation
		)

		message_data = {
			"style": style,
			"expediteur": self.user.username,
			"destinataire": destinataire.username,
			"expediteur_id": self.user.id,
			"destinataire_id": destinataire.id,
			"message": message_text,
			"date": message_obj.date.isoformat()  # Utilisation de isoformat() pour la date
		}
			
		# Étape 3: Envoyer le message au destinataire
		await self.channel_layer.group_send(
			f"user_{destinataire.id}",
			{
				"type": "chat_message",
				"message_data": message_data
			}
		)

		# Étape 4: Envoyer le message à l'utilisateur courant
		await self.send(text_data=json.dumps({
				'type': "message",
				'message': message_data
			}))
		
	async def chat_message(self, event):
		# Récupère les données du message
		message_data = event["message_data"]

		# Envoie le message via WebSocket
		await self.send(text_data=json.dumps({
				'type': "message",
				'message': message_data
			}))

	async def handle_pong_invitation(self, destinataire):
		style = "jeu"

		# Etape 2: chercher ou créer la conversation
		conversation = await sync_to_async(Conversation.objects.filter(
			(Q(user_1=self.user) & Q(user_2=destinataire)) |
			(Q(user_1=destinataire) & Q(user_2=self.user))
		).first)()
		
		if not conversation:
			conversation = await sync_to_async(Conversation.objects.create)(
				user_1=self.user, user_2=destinataire
			)
		
		# Etape 3: créer le message dans la base de données et passer la variable invitationAJouer a True
		message_obj = await sync_to_async(Message.objects.create)(
			style=style, expediteur=self.user, destinataire=destinataire,
			message="invitation a jouer", conversation=conversation
		)

		await sync_to_async(setattr)(conversation, 'invitationAJouer', True)
		await sync_to_async(conversation.save)()


		#Etape 4: Envoyer un message aux deux personnes qui leur indique qu'une invitation a été lancé
		message_data = {
			"style": style,
			"expediteur_id": self.user.id,
			"expediteur_username": self.user.username,
			"destinataire_id": destinataire.id,
			"destinataire_username": destinataire.username,
			"message_id": message_obj.id,
			"message": "invitation à jouer",
			"timeout": 60,  # Temps en secondes
			"date": message_obj.date.isoformat()  # Utilisation de isoformat() pour la date
		}

		await self.channel_layer.group_send(
			f"user_{destinataire.id}",
			{
				"type": "pong_invitation_event",
				"message_data": message_data
			})
		await self.send(text_data=json.dumps({
				'type': "pong_invitation",
				'message': message_data
			}))
		# Etape 5: Attendre 60 secondes pour la réponse
		asyncio.create_task(self.handle_invitation_timeout(conversation.id, message_obj, destinataire))

	async def handle_invitation_timeout(self, conversation_id, message_obj, destinataire):
		print("\ndébut des 60 secondes\n", flush=True)

		# Attendre 60 secondes
		await asyncio.sleep(60)

		print("\nfin des 60 secondes\n", flush=True)

		# Étape 6: vérifier si la variable invitationAJouer est toujours True
		conversation_refreshed = await sync_to_async(Conversation.objects.get)(id=conversation_id)
		if conversation_refreshed.invitationAJouer:
			# Étape 7: repasser la variable à False et mettre à jour le message dans la base de données
			await sync_to_async(setattr)(conversation_refreshed, 'invitationAJouer', False)
			await sync_to_async(conversation_refreshed.save)()
			await sync_to_async(setattr)(message_obj, 'message', "temps écoulé")
			await sync_to_async(message_obj.save)()

			# Étape 8: envoyer un message aux deux personnes pour dire que le temps est écoulé
			message_data = {
				"style": "jeu",
				"expediteur_id": self.user.id,
				"expediteur_username": self.user.username,
				"destinataire_id": destinataire.id,
				"destinataire_username": destinataire.username,
				"message_id": message_obj.id,
				"message": "temps écoulé",
				"timeout": 0,
				"date": message_obj.date.isoformat()
			}

			await self.channel_layer.group_send(
				f"user_{destinataire.id}",
				{
					"type": "pong_invitation_event",
					"message_data": message_data
				})
			await self.send(text_data=json.dumps({
				'type': "pong_invitation",
				'message': message_data
			}))
	
	async def pong_invitation_event(self, event):
		message_data = event["message_data"]
		await self.send(text_data=json.dumps({
			"type": "pong_invitation",
			"message": message_data
		}))

	async def handle_pong_invitation_annulation(self, data, destinataire):
		message_id_db = data.get("message_id_db")
		style = "jeu"

        # Etape 1: mettre a jour le message dans la basse de données
		try:
			message = await sync_to_async(Message.objects.get)(id=message_id_db)
		except Message.DoesNotExist:
			await self.send(text_data=json.dumps({"error": "Message non trouvé"}))
		
		await sync_to_async(setattr)(message, 'message', "invitation annulée")
		await sync_to_async(message.save)()

		#Etape 2: chercher la conversation et mettre invitationAJouer à False
		conversation = await sync_to_async(Conversation.objects.filter(
			(Q(user_1=self.user) & Q(user_2=destinataire)) |
			(Q(user_1=destinataire) & Q(user_2=self.user))
		).first)()

		await sync_to_async(setattr)(conversation, 'invitationAJouer', False)
		await sync_to_async(conversation.save)()
		
        # Etape 2: renvoyer l'info aux deux personnes
		message_data = {
			"style": style,
			"expediteur_id": self.user.id,
			"expediteur_username": self.user.username,
			"destinataire_id": destinataire.id,
			"destinataire_username": destinataire.username,
			"message_id": message.id,
			"message": "invitation annulée",
			"date": message.date.isoformat()  # Utilisation de isoformat() pour la date
		}

		await self.send(text_data=json.dumps({
			"type": "pong_invitation",
			"message": message_data
		}))

		await self.channel_layer.group_send(
			f"user_{destinataire.id}",
			{
				"type": "pong_invitation_annulée_event",
				"message_data": message_data
			})
		
	async def pong_invitation_annulée_event(self, event):
		await self.send(text_data=json.dumps({
			"type": "pong_invitation",
			"message": event["message_data"]
		}))

	async def handle_pong_invitation_refuse(self, data, destinataire):
		message_id_db = data.get("message_id_db")
		style = "jeu"

        # Etape 1: mettre a jour le message dans la basse de données
		try:
			message = await sync_to_async(Message.objects.get)(id=message_id_db)
		except Message.DoesNotExist:
			await self.send(text_data=json.dumps({"error": "Message non trouvé"}))
		
		await sync_to_async(setattr)(message, 'message', "invitation refusée")
		await sync_to_async(message.save)()

		#Etape 2: chercher la conversation et mettre invitationAJouer à False
		try:
			conversation = await sync_to_async(Conversation.objects.filter(
				(Q(user_1=self.user) & Q(user_2=destinataire)) |
				(Q(user_1=destinataire) & Q(user_2=self.user))
			).first)()
			await sync_to_async(setattr)(conversation, 'invitationAJouer', False)
			await sync_to_async(conversation.save)()
		except Conversation.DoesNotExist:
			await self.send(text_data=json.dumps({"error": "Conversation non trouvée"}))

        # Etape 2: renvoyer l'info aux deux personnes
		message_data = {
			"style": style,
			"expediteur_id": self.user.id,
			"expediteur_username": self.user.username,
			"destinataire_id": destinataire.id,
			"destinataire_username": destinataire.username,
			"message_id": message.id,
			"message": "invitation refusée",
			"date": message.date.isoformat()  # Utilisation de isoformat() pour la date
		}

		await self.send(text_data=json.dumps({
			"type": "pong_invitation",
			"message": message_data
		}))

		await self.channel_layer.group_send(
			f"user_{destinataire.id}",
			{
				"type": "pong_invitation_refusée_event",
				"message_data": message_data
			})
		
	async def pong_invitation_refusée_event(self, event):
		await self.send(text_data=json.dumps({
			"type": "pong_invitation",
			"message": event["message_data"]
		}))

	async def handle_block_user(self, destinataire, block_type):
		await self.channel_layer.group_send(
			f"user_{destinataire.id}",
			{
				"type": "block_user_event",
				"block_type": block_type,
				"blocker_id": self.user.id,
				"blocker_username": self.user.username
			}
		)

	async def block_user_event(self, event):
		await self.send(text_data=json.dumps({
			"type": "block_user",
			"block_type": event["block_type"],
			"blocker_id": event["blocker_id"],
			"blocker_username": event["blocker_username"]
		}))
