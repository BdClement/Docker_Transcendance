from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer

class OnlineStatusConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		await self.accept()
		
		await self.channel_layer.group_add(
			f"user_{self.scope['user'].id}",
			self.channel_name
		)
		
		await self.update_user_status(True)
		
		await self.notify_friends_status(True)

	async def disconnect(self, close_code):
		await self.update_user_status(False)
		
		await self.notify_friends_status(False)
		
		await self.channel_layer.group_discard(
			f"user_{self.scope['user'].id}",
			self.channel_name
		)

	@database_sync_to_async
	def update_user_status(self, status):
		User = get_user_model()
		User.objects.filter(id=self.scope['user'].id).update(is_online=status)

	@database_sync_to_async
	def get_friends(self):
		return list(self.scope['user'].followers.all())

	async def notify_friends_status(self, status):
		friends = await self.get_friends()
		for friend in friends:
			await self.channel_layer.group_send(
				f"user_{friend.id}",
				{
					"type": "user_status",
					"user_id": self.scope['user'].id,
					"status": status
				}
			)

	async def user_status(self, event):
		await self.send(text_data=json.dumps({
			"user_id": event["user_id"],
			"status": event["status"]
		}))