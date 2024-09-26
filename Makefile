NAME = Transcendance

DC_PATH = srcs/docker-compose.yml

RED = \033[0;31m
GREEN = \033[0;32m
RESET = \033[0m

all:
		@echo "$(GREEN)Launching $(NAME)$(RESET)"
		@docker compose -f $(DC_PATH) up --build

down:
		@echo "$(RED)$(NAME) down$(RESET)"
		@docker compose -f $(DC_PATH) down

up:
		@echo "$(GREEN) $(NAME) up$(RESET)"
		@docker compose -f $(DC_PATH) up

logs:
		@echo "$(GREEN) $(NAME) logs$(RESET)"
		@docker compose -f $(DC_PATH) logs -f

view:
		@echo "$(GREEN)Checking running containers$(RESET)"
		@docker ps
		@echo "$(GREEN)Checking all containers$(RESET)"
		@docker ps -a
		@echo "$(GREEN)Checking images$(RESET)"
		@docker images

clean: down
		@echo "$(RED)Cleaning $(NAME) docker$(RESET)"
		@docker system prune -af

fclean: clean

re: fclean all

help:

	@echo "Available commands:"
	@echo "  make all             Launch the application"
	@echo "  make up              Start the application"
	@echo "  make view            Global view of containers/images"
	@echo "  make down            Stop the application"
	@echo "  make clean           Clean resources"
	@echo "  make fclean          Force clean up"
	@echo "  make re              Rebuild and launch the application"

PHONY: all down up clean fclean re


#Pour l'instant lors du developpement de l'application je laisse les logs affiche en temps reel pour voir directement les problemes
#Pour la version finale, il faudrait lancer les containers en arriere plan avce -d et donc ne pas afficher les logs

