// main.js
const PongGame = (function() {
    let currentGameId = null;
    let socket = null;
    let gameLoopInterval = null;
    let isLocalGame = true;
    let gameModal = null;
    let gameState = {};
    let isPlayer1 = false;
    let keyState = { w: false, s: false, ArrowUp: false, ArrowDown: false, t: false, g: false, i: false, k: false };

    function initializeGame(gameId, nbPlayers,isCreator = false) {

        console.log(`[initializeGame] Initializing game with ID: ${gameId}, Number of Players: ${nbPlayers}`);
        isPlayer1 = isCreator;
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        socket = new WebSocket(`wss://${window.location.host}/wss/game/${gameId}/`);

        socket.onopen = function(e) {
            console.log(`[WebSocket] Connection established for game ${gameId}`);
        };

        socket.onmessage = function(e) {
            // console.log(`[WebSocket] Received message:`, e.data);
            const data = JSON.parse(e.data);
            if (data.message === 'end_game') {
                fetchGameDetails(currentGameId);
            } else {
                gameState = data;
                draw(ctx);
            }
        };

        socket.onclose = function(e) {
            console.error(`[WebSocket] Connection closed for game ${gameId}. Code: ${e.code}, Reason: ${e.reason}`);
            terminateGame();
        };

        socket.onerror = function(error) {
            console.error(`[WebSocket] Error in game ${gameId}:`, error);
        };

        gameLoopInterval = setInterval(updatePaddlePositions, 1000 / 60);
    }

    function navigateTo(title, url, content, gameId = null) {
        console.log(`[navigateTo] Navigating to: ${title}, URL: ${url}, Game ID: ${gameId}`);
        const state = { title, content, gameId };
        history.pushState(state, title, url);
        updateUI(state);
    }

    function updateUI(state) {
        console.log(`[updateUI] Updating UI with state:`, state);
        const mainContent = document.querySelector('.main-content');

        if (state.gameId) {
            console.log(`[updateUI] Setting up game UI for game ID: ${state.gameId}`);
            gameModal.show();
            currentGameId = state.gameId;
        } else {
            console.log(`[updateUI] Resetting to home UI`);
            gameModal.hide();
            terminateGame();
        }

        if (mainContent) {
            mainContent.innerHTML = `<h1>${state.title}</h1><p>${state.content}</p>`;
        }

        document.title = state.title;
    }

    function terminateGame() {
        console.log(`[terminateGame] Terminating current game`);
        if (socket) {
            if (socket.readyState === WebSocket.OPEN) {
                console.log(`[terminateGame] Sending disconnect message`);
                socket.send(JSON.stringify({ 'action': 'disconnect', 'player': 'all' }));
            }
            socket.close();
            socket = null;
        }
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
        }
        currentGameId = null;
        isLocalGame = true;

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function draw(ctx) {
        const canvas = ctx.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';

        const paddleWidth = 10, paddleHeight = 100, ballSize = 10;

        if (gameState.ball) {
            ctx.beginPath();
            ctx.arc(gameState.ball[0], gameState.ball[1], ballSize, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 1; i <= 4; i++) {
            const player = gameState[`player_${i}`];
            if (player) {
                ctx.fillRect(player[0], player[1], paddleWidth, paddleHeight);
            }
        }

        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${gameState.score_team_1} - ${gameState.score_team_2}`, canvas.width / 2, 50);
    }

    function updatePaddlePositions() {
        if (!isLocalGame) {
            if (isPlayer1) {
                if (keyState.w) sendPaddleMovement(1, 'up');
                if (keyState.s) sendPaddleMovement(1, 'down');
            } else {
                if (keyState.w) sendPaddleMovement(2, 'up');
                if (keyState.s) sendPaddleMovement(2, 'down');
            }        
        } else {
            if (keyState.w) sendPaddleMovement(1, 'up');
            if (keyState.s) sendPaddleMovement(1, 'down');
            if (keyState.t) sendPaddleMovement(3, 'up');
            if (keyState.g) sendPaddleMovement(3, 'down');
            if (keyState.i) sendPaddleMovement(4, 'up');
            if (keyState.k) sendPaddleMovement(4, 'down');
            if (keyState.ArrowUp) sendPaddleMovement(2, 'up');
            if (keyState.ArrowDown) sendPaddleMovement(2, 'down');
        }
    }

    function sendPaddleMovement(player, direction) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 'player': player, 'move': direction }));
            console.log("Player:", player, "direction:", direction);
        }
    }

    function fetchGameDetails(gameId) {
        fetch(`/api/play/detail/${gameId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Affichage du retour API', data);
                endGame(data);
            })
    }

    function endGame(gameDetails) {
        let message;

        if (gameDetails && gameDetails.is_finished) {
            const { nb_players, results } = gameDetails;
        
            if (nb_players === 2) {
                message = t('PlayerWin') + gameDetails.results.winners;
            } else if (nb_players === 4) {
                message = t('TeamWins') + gameDetails.results.winners;
            }
        } else {
            message = t('gameEndedUnexpectedly');
        }
    
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
    
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        ctx.fillStyle = 'white';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
        clearInterval(gameLoopInterval);
    
        setTimeout(() => {
            gameModal.hide();
            document.body.classList.remove('modal-open');
            const modalBackdrop = document.querySelector('.modal-backdrop');
            if (modalBackdrop) {
                modalBackdrop.remove();
            }
            const playForm = document.getElementById('playForm');
            playForm.classList.remove('d-none');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            navigateTo('Jeu de Pong', '/', 'The game has been terminated.');
        }, 2000);
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log(`[DOMContentLoaded] Initializing PongGame`);
        gameModal = new bootstrap.Modal(document.getElementById('gameModal'));

        document.getElementById('gameModal').addEventListener('hidden.bs.modal', function () {
            console.log(`[gameModal] Modal hidden`);
            terminateGame();
            navigateTo('Jeu de Pong', '/', 'The game has been terminated.');
        });

        document.getElementById('playForm').addEventListener('submit', function(event) {
            event.preventDefault();
            console.log(`[playForm] Form submitted`);

            const gameMode = document.querySelector('input[name="game_mode"]:checked').value;
            console.log(`[playForm] Selected game mode: ${gameMode}`);

            let remote, nbPlayers;

            switch (gameMode) {
                case 'remote_1v1':
                    remote = true;
                    nbPlayers = 2;
                    break;
                case 'local_1v1':
                    remote = false;
                    nbPlayers = 2;
                    break;
                case 'local_2v2':
                    remote = false;
                    nbPlayers = 4;
                    break;
            }

            isLocalGame = !remote;
            console.log(`[playForm] Game settings - Remote: ${remote}, Players: ${nbPlayers}`);

            if (remote && nbPlayers === 2) {
                fetchAvailableGames(remote, nbPlayers);
            } else {
                createNewGame(remote, nbPlayers);
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key in keyState) {
                keyState[event.key] = true;
            }
        });

        document.addEventListener('keyup', function(event) {
            if (event.key in keyState) {
                keyState[event.key] = false;
            }
        });

        initializeLanguageSelector();

        function fetchAvailableGames(remote, nbPlayers) {
            console.log(`[fetchAvailableGames] Fetching available games. Remote: ${remote}, Players: ${nbPlayers}`);
            fetch('/api/play/list')
                .then(response => response.json())
                .then(games => {
                    console.log(`[fetchAvailableGames] Received ${games.length} available games`);
                    if (games.length > 0) {
                        displayAvailableGames(games);
                    } else {
                        console.log(`[fetchAvailableGames] No games available, creating new game`);
                        createNewGame(true, 2);
                    }
                })
                .catch(error => {
                    console.error('[fetchAvailableGames] Error:', error);
                    createNewGame(true, 2);
                });
        }

        function displayAvailableGames(games) {
            let container = document.querySelector('.main-content');
            if (!container) {
                container = document.createElement('div');
                container.className = 'main-content';
                document.body.insertBefore(container, document.getElementById('gameModal'));
            }
            
            container.style.display = 'block';
            container.innerHTML = '';
        
            const title = document.createElement('h1');
            title.textContent = 'Available Games';
            container.appendChild(title);

            const availableGames = games.filter(game => game.player_connected > 0);
        
            if (availableGames.length > 0) {
                const gameList = document.createElement('ul');
                availableGames.forEach(game => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `Game ${game.id} (${game.player_connected}/${game.nb_players} players)`;
                    listItem.addEventListener('click', () => {
                        joinGame(game.id);
                        container.style.display = 'none';
                    });
                    gameList.appendChild(listItem);
                });
                container.appendChild(gameList);
            } else {
                const noGamesMessage = document.createElement('p');
                noGamesMessage.textContent = 'No available games found.';
                container.appendChild(noGamesMessage);
            }
        
            const newGameButton = document.createElement('button');
            newGameButton.textContent = 'Create New Game';
            newGameButton.addEventListener('click', () => {
                createNewGame(true, 2);
                container.style.display = 'none';
            });
            container.appendChild(newGameButton);
        
        }

        function joinGame(gameId) {
            console.log(`[joinGame] Attempting to join game: ${gameId}`);
            
            fetchWithCsrf(`/api/play/join/${gameId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to join the game');
                }
                return response.json();
            })
            .then(result => {
                console.log(`[joinGame] Game joining response:`, result);
                const newUrl = `/game/${gameId}`;
                const newTitle = `Pong Game ${gameId}`;
                const newContent = `Playing Pong Game ${gameId}`;
                navigateTo(newTitle, newUrl, newContent, gameId);
                initializeGame(gameId, 2, false);
            })
            .catch(error => {
                console.error('[joinGame] Error:', error);
                alert('Failed to join the game. Please try again.');
            });
        }

        function createNewGame(remote, nbPlayers) {
            console.log(`[createNewGame] Creating new game. Remote: ${remote}, Players: ${nbPlayers}`);
            const data = {
                remote: remote,
                nb_players: nbPlayers
            };

            console.log(`[createNewGame] Sending game creation request with data:`, data);

            return fetchWithCsrf(`api/play/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(result => {
                console.log(`[createNewGame] Game creation response:`, result);
                const gameId = result.id;
                const newUrl = `/game/${gameId}`;
                const newTitle = `Pong Game ${gameId}`;
                const newContent = `Playing Pong Game ${gameId}`;
                navigateTo(newTitle, newUrl, newContent, gameId);
                initializeGame(gameId, nbPlayers, true);
            })
            .catch(error => {
                console.error('[createNewGame] Error:', error);
                alert(error.message);
            });
        }

        function initializeLanguageSelector() {
            const languageSelector = document.getElementById('language');
            if (languageSelector) {
                languageSelector.addEventListener('change', function() {
                    const selectedLanguage = this.value;
                    localStorage.setItem('language', selectedLanguage);
                    // location.reload();
                });

                const currentLanguage = localStorage.getItem('language') || 'fr';
                languageSelector.value = currentLanguage;
            }
        }

        window.addEventListener('popstate', (e) => {
            if (isLocalGame) {
                e.preventDefault();
                terminateGame();
                navigateTo('Jeu de Pong', '/', 'The local game has been terminated.');
                return;
            }

            if (e.state) {
                updateUI(e.state);
            } else {
                updateUI({ title: 'Jeu de Pong', content: 'Welcome to the home page' });
            }
        });

        history.replaceState({ title: 'Jeu de Pong', content: 'Welcome to the home page' }, 'Jeu de Pong', '/');
        updateUI({ title: 'Jeu de Pong', content: 'Welcome to the home page' });
    });

    return {
        navigateTo: navigateTo,
        initializeGame: initializeGame
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PongGame;
} else {
    window.PongGame = PongGame;
}
