"""
ASGI config for Transcendance project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack #(authentification de qui utilise la socket)
# En gros l'authentification permettra une personnalisation car acces a l'utiisateur connecte dans le Consumer
from django.urls import path
# from game.consumers import GameConsumer
# from game import routing.websocket_urlpatterns
from game.routing import websocket_urlpatterns as game_websocket_urlpatterns
from authentication.routing import websocket_urlpatterns as auth_websocket_urlpatterns

# Combiner les patterns
all_websocket_urlpatterns = auth_websocket_urlpatterns + game_websocket_urlpatterns

application = ProtocolTypeRouter({
	"http": get_asgi_application(),
	"websocket": AuthMiddlewareStack(
		URLRouter(
			all_websocket_urlpatterns
		)
	),
})

# application = ProtocolTypeRouter({
#     "http": get_asgi_application(),  # Traite les requÃªtes HTTP
#     "websocket": AuthMiddlewareStack(
#         URLRouter([
#             path('ws/game/<int:game_id>/', GameConsumer.as_asgi()),
#         ])
#     ),
# })

#A lancer pour lancer le serveur daphne
# daphne -p 8000 Transcendance.Transcendance.asgi:application
