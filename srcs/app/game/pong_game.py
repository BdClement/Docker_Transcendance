import random
import asyncio
import django
import os

from channels.layers import get_channel_layer
from channels.db import database_sync_to_async

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Transcendance.settings')
django.setup()

from .models import Play



class PongGame:
    def __init__(self, play_id, game_group_name):
        self.width = 800
        self.height = 600
        self.paddle_width = 10
        self.paddle_height = 100
        self.ball_radius = 10
        self.is_running = False
        self.play = Play.objects.get(pk=play_id)
        self.game_group_name = game_group_name
        self.channel_layer = get_channel_layer()

        # Initialisation des positions Y
        self.players_y = {1: self.height // 2 - self.paddle_height // 2,
                          2: self.height // 2 - self.paddle_height // 2}
        # Initialisation des positions X
        self.players_x =    {1: 0,
                            2: self.width - 10}
        #initialisation des scores
        self.team_scores = { 1: 0,
                            2: 0}
        #Initialisation des positions des players 3 et 4 si necessaire
        if self.play.nb_players == 4:
            #fonction update() pour mettre a  jour le dictionnaire (simialire a dictionnaire['nouvelle_Cle] = Valeur)
            self.players_y.update({
            3: self.players_y[1],
            4: self.players_y[1]
        })
            self.players_x.update({
            3: self.width // 4,
            4: (self.width // 4) * 3
        })

        # Initialisation de la balle
        self.ball_x, self.ball_y = self.width // 2, self.height // 2
        self.ball_speed_x, self.ball_speed_y = 5 * random.choice((1, -1)), 5 * random.choice((1, -1))

        # Cas Remote a ajouter


    # Cette fonction lance une partie en creant une tache en arriere plan dans laquelle la boucle du jeu se lance
    # Cela permet a la boucle de se lancer tout en liberant le consumer pour qu'il ne bloque pas au lancement du jeu
    async def start_game(self):
        if not self.is_running:
            self.is_running = True
            self.game_loop_task = asyncio.create_task(self.game_loop())

    # Situations pour que cette fonction soit appelee :
        #-La partie est finie normalement donc enregisrement des resultats et la tache se termine toute seule
        #-La partie se termine a cause de la deconnexion de tous les clients donc il faut stopper la tache en arriere plan
        # et attendre que celle ci soit bien arretee. Pas d'enregistrement de resultats puisque arret de maniere inattendue
    async def stop_game(self):
        # Stockage de resultats si la partie est terminee normalement
        if self.play.is_finished:
            #Identification du winner et du losers
            if self.team_scores[1] == 3:
                #Listes d'objets contenant des Player
                winners = [self.play.player1]
                losers = [self.play.player2]
            else:
                winners = [self.play.player2]
                losers = [self.play.player1]
            #Ajout du winner et loser supplementaire en cas de mode multijoueur (2v2)
            if self.play.nb_players == 4:
                winners.append(self.play.player3 if self.team_scores[1] == 3 else self.play.player4)
                losers.append(self.play.player4 if self.team_scores[1] == 3 else self.play.player3)
            #Dictionnaire player concerne (cle): score du joueur (valeur)
            scores = {
                "player1": self.team_scores[1],#remplacer par winners[0].name
                "player2": self.team_scores[2]
            }
            if self.play.nb_players == 4:
                scores.update({
                    "player3": self.team_scores[1],
                    "player4": self.team_scores[2]
                })
            # fonction du model Play qui enregistre dans la base de donnee les resultats
            await self.play.end_game(winners, losers, scores)
        # Arret de la tache en arriere plan en cas d'arret inattendu
        elif self.is_running:
            try:
                self.game_loop_task.cancel()
                await self.game_loop_task
            except asyncio.CancelledError:
                pass
        # Detruire le Consumer ici quoiqu'il arrive


    async def update_player_position(self, player_number, y):
        if player_number in self.players_y:
            if y == 'up' and self.players_y[player_number] != 0:
                self.players_y[player_number] -= 10
            elif y == 'down' and self.players_y[player_number] != self.height - self.paddle_height:
                self.players_y[player_number] += 10

    async def update_game_state(self):
        # Update ball position
        self.ball_x += self.ball_speed_x
        self.ball_y += self.ball_speed_y

        # Gestion des collisions avec les murs du haut et du bas
        if self.ball_y - self.ball_radius <= 0 or self.ball_y + self.ball_radius >= self.height:
            self.ball_speed_y *= -1
            # Ajuster la position de la balle pour éviter qu'elle ne reste au mur
            self.ball_y = max(self.ball_radius, min(self.height - self.ball_radius, self.ball_y))

        # Gestion des collisions avec les raquettes
        if (self.ball_x - self.ball_radius <= self.paddle_width and
            self.players_y[1] < self.ball_y < self.players_y[1] + self.paddle_height):
            self.ball_speed_x = abs(self.ball_speed_x)  # Rebond vers la droite
            self.ball_x = self.paddle_width + self.ball_radius  # Évite que la balle ne reste à la raquette
        elif (self.ball_x + self.ball_radius >= self.width - self.paddle_width and
            self.players_y[2] < self.ball_y < self.players_y[2] + self.paddle_height):
            self.ball_speed_x = -abs(self.ball_speed_x)  # Rebond vers la gauche
            self.ball_x = self.width - self.paddle_width - self.ball_radius  # Évite que la balle ne reste à la raquette

        if self.play.nb_players == 4:
            if (self.ball_x - self.ball_radius <= self.players_x[3] + self.paddle_width and
                self.players_x[3] <= self.ball_x and
                self.players_y[3] < self.ball_y < self.players_y[3] + self.paddle_height):
                self.ball_speed_x = abs(self.ball_speed_x)  # Rebond vers la droite
                self.ball_x = self.players_x[3] + self.paddle_width + self.ball_radius  # Repositionner la balle

            if (self.ball_x + self.ball_radius >= self.players_x[4] and
                self.players_x[4] >= self.ball_x and
                self.players_y[4] < self.ball_y < self.players_y[4] + self.paddle_height):
                self.ball_speed_x = -abs(self.ball_speed_x)  # Rebond vers la gauche
                self.ball_x = self.players_x[4] - self.ball_radius

        # Comptage des points et réinitialisation de la balle
        if self.ball_x - self.ball_radius <= 0:
            self.team_scores[2] += 1
            await self.reset_ball()
        elif self.ball_x + self.ball_radius >= self.width:
            self.team_scores[1] += 1
            await self.reset_ball()

        #Retourne l'ensemble des positions de la partie
        data = {
            'ball': (self.ball_x, self.ball_y),
            'player_1':(self.players_x[1], self.players_y[1],),
            'player_2': (self.players_x[2], self.players_y[2]),
            'score_team_1' :self.team_scores[1],
            'score_team_2' :self.team_scores[2]
        }
        if self.play.nb_players == 4:
            data['player_3'] = (self.players_x[3], self.players_y[3])
            data['player_4'] = (self.players_x[4], self.players_y[4])
        return data

    async def reset_ball(self):
        # Réinitialiser la position de la balle au centre
        self.ball_x, self.ball_y = self.width // 2, self.height // 2
        # Donner une direction aléatoire à la balle
        self.ball_speed_x = 5 * random.choice((1, -1))
        self.ball_speed_y = 5 * random.choice((1, -1))

    async def game_loop(self):
        while self.is_running:
            game_state = await self.update_game_state()
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'update_game',
                    **game_state
                }
            )
            await asyncio.sleep(1 / 60)
            if self.team_scores[1] == 3 or self.team_scores[2] == 3:
                self.play.is_finished = True
                self.is_running = False
                await database_sync_to_async(self.play.save)()
                #Envoi d'un message pour signifier la fin de partie
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'update_game',
                        'message': 'end_game'
                    }
                )
                await self.stop_game()


# PONG GAME DE JULIEN
# import random

# class PongGame:
#     def __init__(self, width=800, height=600, paddle_width=10, paddle_height=100, ball_radius=10):
#         self.width = width
#         self.height = height
#         self.paddle_width = paddle_width
#         self.paddle_height = paddle_height
#         self.ball_radius = ball_radius

#         # Initialisation des positions
#         self.player1_y = self.height // 2 - self.paddle_height // 2
#         self.player2_y = self.height // 2 - self.paddle_height // 2

#         # Initialisation de la balle
#         self.ball_x, self.ball_y = self.width // 2, self.height // 2
#         self.ball_speed_x, self.ball_speed_y = 5 * random.choice((1, -1)), 5 * random.choice((1, -1))

#     def update_player1_position(self, y):
#         self.player1_y = y

#     def update_game_state(self):
#         # Update ball position
#         self.ball_x += self.ball_speed_x
#         self.ball_y += self.ball_speed_y

#         # Rebond sur les murs du haut et du bas
#         if self.ball_y - self.ball_radius <= 0 or self.ball_y + self.ball_radius >= self.height:
#             self.ball_speed_y *= -1

#         # Rebond sur les raquettes
#         if (self.ball_x - self.ball_radius <= self.paddle_width and self.player1_y < self.ball_y < self.player1_y + self.paddle_height) or \
#            (self.ball_x + self.ball_radius >= self.width - self.paddle_width and self.player2_y < self.ball_y < self.player2_y + self.paddle_height):
#             self.ball_speed_x *= -1

#         # Rebond sur les murs de gauche et de droite
#         if self.ball_x - self.ball_radius <= 0 or self.ball_x + self.ball_radius >= self.width:
#             self.ball_x, self.ball_y = self.width // 2, self.height // 2
#             self.ball_speed_x *= random.choice((1, -1))
#             self.ball_speed_y *= random.choice((1, -1))

#         # Retourne les positions actuelles pour les envoyer via WebSocket
#         return {
#             'ball_x': self.ball_x,
#             'ball_y': self.ball_y,
#             'player1_y': self.player1_y,
#             'player2_y': self.player2_y
#         }
