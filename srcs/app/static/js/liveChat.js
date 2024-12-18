let chatSocket;
const listeConversation = document.getElementById('liste-amis-live-chat-ul');
let destinataireId = null;

// initialise le websocket de chat
function initWebSocket() {
	// Vérifie si une connexion est déjà ouverte
	if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
		console.warn("Une connexion WebSocket est déjà ouverte.");
		return;
	}

	// Création d'un nouveau WebSocket
	chatSocket = new WebSocket(`wss://${window.location.host}/wss/chat/`);
	console.log("websocket créé");

	// Associe les fonctions aux événements WebSocket
	chatSocket.onmessage = handleIncomingMessage;
	chatSocket.onerror = handleWebSocketError;
	chatSocket.onclose = handleWebSocketClose;
}

// gere les messages recus
function handleIncomingMessage(e) {
	const data = JSON.parse(e.data);

	if (data.type === 'message') {
		afficherMessage(data);
	} else if (data.type === 'block_user') {
		if (destinataireId == data.blocker_id)
		{
			console.log("changement d'etat de blocage");
			HistoriqueMessages(data.blocker_id, data.blocker_username);
		}
	} else if (data.type === 'pong_invitation') {
		console.log("invitation à jouer recu");
		const messageContainer = document.getElementById('message-container');
		if (!messageContainer) {
			console.error("messageContainer introuvable !");
			return;
		}
		invitationJeu(data.message);
		messageContainer.scrollTop = messageContainer.scrollHeight;
	} else if (data.type === 'connection_status') {
		console.log(`${data.user_id} vient de se ${data.status}`);
		
		if (destinataireId === data.user_id) {
			const onlineStatusElement = document.getElementsByClassName("liveChat-online-offline-Status")[0]; // Accéder au premier élément avec cette classe
			
			if (data.status === "connected") {
				onlineStatusElement.innerHTML = `en ligne`;  // Met à jour le texte
				onlineStatusElement.id = "liveChat-onlineStatus";  // Change l'id de l'élément
			} else {
				onlineStatusElement.innerHTML = `hors ligne`;  // Met à jour le texte
				onlineStatusElement.id = "liveChat-offlineStatus";  // Change l'id de l'élément
			}
		}
	} else {
		console.warn("Le type de message n'est pas reconnu. data : '", data, "' mesage : '", data.type, "', data.message : '", data.message, "'");
	}
}

function handleWebSocketError(e) {
	console.error('Erreur WebSocket : ', e);
}

function handleWebSocketClose() {
	console.log('WebSocket fermé, tentez de reconnecter si nécessaire');
	// Si tu souhaites ajouter une reconnexion automatique, tu peux l'implémenter ici
}

// gere les messages recu en rapport au partie via le liveCHat
function invitationJeu(message) {
	const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        console.error("messageContainer introuvable !");
        return;
    }

	charIdInvitation = "Invitation_" + message.message_id;
	messageElement = document.getElementById(charIdInvitation);
	if (messageElement) {
		afficherInvitationJeu(message, messageElement);
	}
	else {
		messageElement = document.createElement('div');
		messageElement.classList.add('message-invitation-jeu');
		messageElement.id = charIdInvitation;
		// Ajoute l'élément au DOM avant de le manipuler
		messageContainer.appendChild(messageElement);
		afficherInvitationJeu(message, messageElement);
	}
}

// affiche des messages spécifiques pour les invitations et les résultats d'une partie, en adaptant le contenu à l'expéditeur, au destinataire, et au contexte.
function afficherInvitationJeu(message, messageElement) {
	if (message.message === "invitation à jouer") {
		if ((message.expediteur_id !== destinataireId) && (message.destinataire_id !== destinataireId))
			{
				showNotification(`Nouvelle invitation à jouer de ${message.expediteur_username}`);
				return;
			}
		if (message.expediteur_id === destinataireId) {
			messageElement.innerHTML = `
				${message.expediteur_username} vous invite à jouer une partie
				<button class="bouton-liveChat" onclick="invitationAccepte(${message.expediteur_id}, '${message.message_id}')">accepter</button>
				<button class="bouton-liveChat" onclick="invitationRefuse(${message.expediteur_id}, '${message.message_id}')">refuser</button>
			`;
		} else {
			messageElement.innerHTML = `
				vous avez invité ${message.destinataire_username} à jouer une partie
				<button class="bouton-liveChat" onclick="invitationAnnule(${message.destinataire_id}, '${message.message_id}')">annuler</button>
			`;
		}
		return ;
	} else if (message.message === "temps écoulé") {
		messageElement.innerHTML = `L'invitation est obsolète`;
	} else if (message.message === "invitation annulée") {
		if (message.expediteur_id === destinataireId) {
			messageElement.innerHTML = `
				${message.expediteur_username} a annulé une invitation
			`;
		} else {
			messageElement.innerHTML = `
				Vous avez annulé l'invitation
			`;
		}
	} else if (message.message === "invitation refusée") {
		if (message.expediteur_id === destinataireId) {
			messageElement.innerHTML = `
				${message.expediteur_username} a refusé votre invitation
			`;
		} else {
			messageElement.innerHTML = `
				Vous avez refusé l'invitation
			`;
		}
	} else if (message.message === "invitation acceptée") {
		console.log("[afficherInvitationJeu] expediteur = '", message.expediteur_username, "', destinataire = '", message.destinataire_username, "'")
		if (message.expediteur_id === destinataireId) {
			messageElement.innerHTML = `
				invitation acceptée, partie en cours...
			`;
			console.log("je suis la personne 1, j'envoie");
		} else {
			messageElement.innerHTML = `
				invitation acceptée, partie en cours...
			`;
			console.log("je suis la personne 2, j'accepte");
			PongGame.joinGame(message.gameId);
		}
	} else if (message.message === "resultats partie"){
		if (message.winners.includes(parseInt(destinataireId)) && destinataireId === message.destinataire_id) {
			messageElement.innerHTML = `
				Partie terminée<br>
				${message.destinataire_username} a gagné, vous avez perdu
			`;
		} else if (message.winners.includes(parseInt(destinataireId)) && destinataireId !== message.destinataire_id) {
			messageElement.innerHTML = `
				Partie terminée<br>
				Vous avez gagné, ${message.expediteur_username} a perdu
			`;
		} else if (!message.winners.includes(parseInt(destinataireId)) && destinataireId === message.destinataire_id) {
			messageElement.innerHTML = `
				Partie terminée<br>
				${message.destinataire_username} a gagné, vous avez perdu
			`;
		} else {
			messageElement.innerHTML = `
				Partie terminée<br>
				Vous avez gagné, ${message.expediteur_username} a perdu
			`;
		}
	} else {
		console.log("Une erreur est survenue, message.mesage = '", message.message, "'");
	}
}

// envoie un message via websocket si l'utilisateur annule la partie
function invitationAnnule(destinataire_id, message_id) {
    chatSocket.send(JSON.stringify({
        'type': "pong_invitation_annulation",
        'destinataire_id': destinataire_id,
		'message_id_db': message_id
    }));
}

// envoie un message via websocket si l'utilisateur refuse la partie
function invitationRefuse(expediteur_id, message_id) {
    chatSocket.send(JSON.stringify({
        'type': "pong_invitation_refuse",
        'destinataire_id': expediteur_id,
		'message_id_db': message_id
    }));
}

// Envoie une invitation à jouer à Pong via WebSocket à un destinataire spécifié par son IdDestinataire.
function inviterPartiePong(IdDestinataire) {
	console.log("fonction inviterPartiePong, IdDestinataire = ", IdDestinataire);
	chatSocket.send(JSON.stringify({
		'type': "pong_invitation",
		'destinataire_id': IdDestinataire
	}));
}

// crée une partie en remote puis envoie un message via websocket si l'utilisateur accepte la partie
function invitationAccepte(expediteur_id, message_id) {
    PongGame.createNewGame(true, 2)
        .then(gameId => {
            chatSocket.send(JSON.stringify({
                'type': "pong_invitation_accepté",
                'destinataire_id': expediteur_id,
                'message_id_db': message_id,
                'gameId': gameId
            }));
        })
        .catch(error => {
            console.error("Erreur lors de la création du jeu ou de l'envoi via WebSocket :", error);
        });
}

// affiche les messages recus
function afficherMessage(data) {
	message = data.message;
	const messageContainer = document.getElementById('message-container');
	if (!messageContainer) {
		console.error("Le conteneur de messages n'a pas été trouvé !");
		return; // Sort de la fonction si le conteneur n'existe pas
	}

	// Création de l'élément pour chaque message
	const messageElement = document.createElement('div');
	console.log("destinataireId = ", destinataireId, ", message.expediteur_id = ", message.expediteur_id);
	if (message.expediteur_id === destinataireId)
	{
		messageElement.classList.add('message-destinataire');
	}
	else if (message.destinataire_id === destinataireId)
		messageElement.classList.add('message-expediteur');
	else {
		console.log("message recu de ", message.expediteur_id);
		showNotification(`Nouveau message de ${message.expediteur}`);
	}

	messageElement.textContent = `${message.expediteur}: ${message.message}`;
	messageContainer.appendChild(messageElement);
	messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Affiche une notification avec le message donné, rend la pop-up visible, puis la cache après 5 secondes
function showNotification(message) {
    const popup = document.getElementById('notification-popup');
    popup.textContent = message;
    popup.classList.add('show');

    // Cachez la pop-up après 5 secondes
    setTimeout(() => {
        popup.classList.remove('show');
    }, 5000);
}

// Affiche la liste des amis,
// réinitialise le champ de recherche,
// charge les conversations depuis l'API
function listeAmisLiveChat() {
	document.getElementById('liste-amis-live-chat').style.display = 'block';
	document.getElementById('conversation-live-chat').style.display = 'none';
	document.getElementById('searchInput').value = '';
	document.getElementById('userListContainer').innerHTML = '';
	document.getElementById('searchInput').addEventListener('input', handleSearchInput);
	destinataireId = null;
	
	fetch('/api/listeconversation/')
		.then(response => response.json())
		.then(data => {
			// Accédez directement à 'data.conversations' au lieu de 'data'
			if (data.error) {
				console.log("aucune conversation trouvé");
				return ;
			}
			listeConversation.innerHTML = data.conversations.map(user => `
				<li>
					<button data-user-id="${user.id}" onclick="HistoriqueMessages(${user.id}, '${user.username}')">${user.username}</button>
				</li>
			`).join('');
		})
		.catch(error => {
			console.error('Erreur lors de la récupération des abonnements :', error);
		});
}

// Fonction pour gérer la recherche en temps réel
function handleSearchInput(event) {
    const query = event.target.value.trim(); // Récupère la valeur du champ de recherche
    const userListContainer = document.getElementById('userListContainer');

    if (query.length > 0) {
        console.log("Recherche en cours : ", query); // Vérifie si la valeur de recherche est récupérée correctement
        fetchUsers(query); // Appelle la fonction pour récupérer les utilisateurs
    } else {
        console.log("Recherche vide");
        userListContainer.innerHTML = ''; // Efface les résultats affichés
    }
}

// Fonction pour récupérer la liste des utilisateurs via l'API
function fetchUsers(query = '') {
	console.log("Envoi de la requête avec la recherche :", query);
	fetch(`/api/utilisateurs/?search=${query}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCsrfToken(), // Ajoutez votre token CSRF ici si nécessaire
		},
	})
	.then(response => response.json())
	.then(data => {
		console.log("Réponse de l'API :", data); // Vérifier la réponse de l'API
		displayUserList(data);  // Affiche les utilisateurs dans la liste
	})
	.catch(error => {
		console.error('Erreur lors de la récupération des utilisateurs:', error);
	});
}

// Fonction pour afficher la liste des utilisateurs
function displayUserList(users) {
	console.log("Affichage de la liste des utilisateurs :", users);  // Vérifier les utilisateurs récupérés
	const userListContainer = document.getElementById('userListContainer');
	userListContainer.innerHTML = '';  // Réinitialiser la liste avant d'ajouter les nouveaux résultats
	
	if (users.length === 0) {
		userListContainer.innerHTML = '<p id="choix-conversation"> Aucun utilisateur trouvé.</p>';
		return;
	}

	// Créez un élément HTML pour chaque utilisateur
	users.forEach(user => {
		console.log("utilisateur individuel : ", user.username, ", id : ", user.id);
		const userElement = document.createElement('div');
		userElement.classList.add('user-item');
		userElement.innerHTML = `
			<p id="choix-conversation" data-user-id="${user.id}" onclick="HistoriqueMessages(${user.id}, '${user.username}')">
				${user.username}
			</p>
		`;
		userListContainer.appendChild(userElement);
	});
}

// Affiche l'historique des messages d'une conversation
// charge les données depuis l'API,
// met à jour l'interface avec les informations du destinataire et les messages
// Si aucune conversation n'est trouvée, affiche un message approprié.
function HistoriqueMessages(id, destinataireUsername) {
	enTeteConv = document.getElementById('en-tete-conversation-live-chat');
	envoieOuBloque = document.getElementById('envoie-ou-message-bloque');
	conversationLiveChat = document.getElementById('conversation-live-chat');
	console.log("username : ", destinataireUsername, " id : ", id);
	document.getElementById('liste-amis-live-chat').style.display = 'none';
	conversationLiveChat.style.display = 'block';
	enTeteConv.innerHTML = '';
	envoieOuBloque.innerHTML = '';
	document.getElementById('message-container').innerHTML = '';

	fetch(`/api/messageHistory/${id}/`)
	.then(response => response.json())
	.then(data => {
		if (data.messages && Array.isArray(data.messages)) {
			destinataireId = id;
			afficherHistoriqueMessages(data.messages);
			affichageConversation(id, destinataireUsername, data);
			scrollToBottom();
		} else if (data.noConversation) {
			destinataireId = id;
			affichageConversation(id, destinataireUsername, data);
		} else {
			destinataireId = null;
			console.log("destinataireId = null");
			console.error("Les messages ne sont pas disponibles ou ne sont pas dans le bon format.");
		}
	})
	.catch(error => {
		destinataireId = null;
			console.log("destinataireId = null");
			console.error('Erreur lors du chargement de l\'historique des messages :', error);
	});
}

// Met à jour l'en-tête de la conversation avec le nom du destinataire
// et un bouton pour voir son profil
// Gère l'affichage des boutons pour bloquer ou débloquer un utilisateur en fonction de l'état de blocage,
// et affiche un champ de message pour envoyer des messages si aucune restriction n'est en place
function affichageConversation(id, destinataireUsername, data) {
	enTeteConv.innerHTML = `
		<h6 id="nom-contact-live-chat">${destinataireUsername}</h6>
		<p class="liveChat-online-offline-Status" id="${data.destinataire_onlineStatus ? 'liveChat-onlineStatus' : 'liveChat-offlineStatus'}">
			${data.destinataire_onlineStatus ? 'en ligne' : 'hors ligne'}
		</p>
		<button class="bouton-liveChat" id="view-profile-btn-from-liveChat" class="btn btn-sm custom-btn view-profile" 
			data-user-id="${id}"
			onclick="profileView.handleViewProfile(event)">Voir profil
		</button>
	`;
	const viewProfileButtonFromLiveChat = enTeteConv.querySelector('#view-profile-btn-from-liveChat');
    viewProfileButtonFromLiveChat.addEventListener('click', profileView.handleViewProfile);

	if (data["1bloque2"] === true) {
		enTeteConv.innerHTML += `
			<button class="bouton-liveChat" id="bouton-bloquer" onclick="debloquerUtilisateur(${id}, '${destinataireUsername}')">Débloquer</button>
		`;
		envoieOuBloque.innerHTML = `
			<p>Vous avez bloqué ${destinataireUsername}, vous ne pouvez plus lui envoyer de messages.</p>
		`;
	} else if (data["2bloque1"] === true) {
		enTeteConv.innerHTML += `
			<button class="bouton-liveChat" id="bouton-bloquer" onclick="bloquerUtilisateur(${id}, '${destinataireUsername}')">Bloquer</button>
		`;
		envoieOuBloque.innerHTML = `
			<p>${destinataireUsername} vous a bloqué, vous ne pouvez plus lui envoyer de messages.</p>
		`;
	} else {
		enTeteConv.innerHTML += `
			<button class="bouton-liveChat" id="bouton-bloquer" onclick="bloquerUtilisateur(${id}, '${destinataireUsername}')">Bloquer</button>
		`;
		envoieOuBloque.innerHTML = `
			<input type="text" id="messageInput" placeholder="Entrez votre message">
			<button class="bouton-liveChat" id="boutonEnvoieMessage">Envoyer</button>
			<button class="bouton-liveChat" id="inviterPartiePong" onclick="inviterPartiePong(${id})">Partie</button>
		`;

		const boutonEnvoieMessage = document.getElementById('boutonEnvoieMessage');
		const messageInput = document.getElementById('messageInput');

		boutonEnvoieMessage.addEventListener('click', function() {
			const message = messageInput.value;
			if (message) {
				chatSocket.send(JSON.stringify({
					'type': "send_message",
					'message': message,
					'destinataire_id': destinataireId
				}));
			}
		messageInput.value = ''; // Vide le champ de saisie
		});
	}
}

// Affiche l'historique des messages en vidant d'abord le conteneur,
// puis en ajoutant chaque message avec un style spécifique (message normal ou invitation de jeu).
// Les messages sont distingués entre expéditeur et destinataire.
function afficherHistoriqueMessages(messages) {
	const messageContainer = document.getElementById('message-container');
	if (!messageContainer) {
		console.error("Le conteneur de messages n'a pas été trouvé !");
		return;
	}

	// Vider le conteneur avant d'ajouter les nouveaux messages
	messageContainer.innerHTML = '';

	messages.forEach(message => {
		if (message.style === "message") {
				const messageElement = document.createElement('div');
				if (message.expediteur_id === destinataireId) {
					messageElement.classList.add('message-destinataire');
				}
				else {
					messageElement.classList.add('message-expediteur');
				}
				messageElement.textContent = `${message.expediteur_username}: ${message.message}`;
				messageContainer.appendChild(messageElement);	
		}
		else if (message.style === "jeu") {
			invitationJeu(message);
		}
		else {
			console.error("erreur lors de l'affichage de l'historique");
		}
	});
}

// Bloque un utilisateur en envoyant une requête POST au serveur,
// puis envoie un message via WebSocket pour notifier le blocage
// Si l'opération réussit, l'historique des messages est mis à jour
// et un message de confirmation est affiché.
function bloquerUtilisateur(idDestinataire, destinataireUsername) {
	fetch(`/bloquer-utilisateur/${idDestinataire}/`, {
		method: 'POST',
		headers: {
			'X-CSRFToken': getCsrfToken('csrftoken'),
			'Content-Type': 'application/json',
		},
	})
	.then(response => response.json())
	.then(data => {
		if (data.error) {
			console.error(data.error);
			alert(data.error);
		} else {

			chatSocket.send(JSON.stringify({
				'type': "block_user",  // Type d'événement correct
				'block_type': "bloqueur",  // Fix du champ
				'destinataire_id': idDestinataire
			}));

			console.log(data.message);
			alert(data.message);
			HistoriqueMessages(idDestinataire, destinataireUsername)
		}
	})
	.catch(error => console.error('Erreur:', error));
}

// Débloque un utilisateur en envoyant une requête POST au serveur,
// puis envoie un message via WebSocket pour notifier le déblocage.
// Si l'opération réussit, l'historique des messages est mis à jour
// et un message de confirmation est affiché.
function debloquerUtilisateur(idDestinataire, destinataireUsername) {
	fetch(`/debloquer-utilisateur/${idDestinataire}/`, {
		method: 'POST',
		headers: {
			'X-CSRFToken': getCsrfToken('csrftoken'),
			'Content-Type': 'application/json',
		},
	})
	.then(response => response.json())
	.then(data => {
		if (data.error) {
			console.error(data.error);
			alert(data.error);
		} else {
			chatSocket.send(JSON.stringify({
				'type': "block_user",  // Type d'événement correct
				'block_type': "bloqué",  // Fix du champ
				'destinataire_id': idDestinataire
			}));
			console.log(data.message);
			alert(data.message);
			HistoriqueMessages(idDestinataire, destinataireUsername)
		}
	})
	.catch(error => console.error('Erreur:', error));
}

// Fonction pour défiler en bas
function scrollToBottom() {
    const messageContainer = document.getElementById("message-container");

    // Vérifier si l'élément existe
    if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    } else {
        console.error("L'élément #messageContainer est introuvable !");
    }
}

// Réinitialise l'ID du destinataire (destinataireId) à null pour fermer la conversation en cours.
function boutonClose() {
	destinataireId = null;
}