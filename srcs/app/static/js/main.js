// main.js
const PongGame = (function() {
    let currentGameId = null;
    let socket = null;
    let gameLoopInterval = null;
    let isLocalGame = true;
    let gameModal = null;
    let gameState = {};
    let isPlayer1 = false;
    let isPlayer2 = false;
    let isPlayer3 = false;
    let isPlayer4 = false;
    let isTournamentGame = false;
    let keyState = { w: false, s: false, ArrowUp: false, ArrowDown: false, t: false, g: false, i: false, k: false };

    function initializeGame(gameId, nbPlayers,isCreator = false) {

        console.log(`[initializeGame] Initializing game with ID: ${gameId}, Number of Players: ${nbPlayers}`);
        isTournamentGame = checkIfTournamentGame();
        updateCloseButton();
        isPlayer1 = isCreator;
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        socket = new WebSocket(`wss://${window.location.host}/wss/game/${gameId}/`);

        socket.onopen = function(e) {
            console.log(`[WebSocket] Connection established for game ${gameId}`);
        };

        socket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            if (data.message === 'end_game') {
                fetchGameDetails(currentGameId);
            } else {
                gameState = data;
                draw(ctx);
            }
        };

        socket.onclose = function(e) {
            terminateGame();
        };

        socket.onerror = function(error) {
        };

        gameLoopInterval = setInterval(updatePaddlePositions, 1000 / 60);
    }

    function checkIfTournamentGame() {
        const tournamentModal = document.getElementById('tournamentFullScreenModal');
        return !!tournamentModal && window.getComputedStyle(tournamentModal).display !== 'none';
    }

    function updateCloseButton() {
        const closeButton = document.querySelector('#gameModal .btn-close');
        if (closeButton) {
            closeButton.style.display = isTournamentGame ? 'none' : '';
        }
    }

    function navigateTo(title, url, content, gameId = null) {
        isTournamentGame = false;
        const state = { title, content, gameId };
        // history.replaceState(state, title, url);
        updateUI(state);
    }

    function updateUI(state) {
        const mainContent = document.querySelector('.main-content');

        if (state.gameId) {
            gameModal.show();
            currentGameId = state.gameId;
        } else {
            gameModal.hide();
            terminateGame();
        }

        if (mainContent) {
            mainContent.innerHTML = `<h1>${state.title}</h1><p>${state.content}</p>`;
        }

        document.title = state.title;
    }

    function terminateGame() {
        if (socket) {
            if (socket.readyState === WebSocket.OPEN) {
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
        isTournamentGame = false;
        isPlayer1 = false;
        isPlayer2 = false;
        isPlayer3 = false;
        isPlayer4 = false;
        updateCloseButton();
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function handleTournamentBackNavigation() {
        terminateGame();
        const tournamentModal = document.getElementById('tournamentFullScreenModal');
        if (tournamentModal) {
            tournamentModal.remove();
        }
        isTournamentGame = false;
        updateCloseButton();
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
            }
            if (isPlayer3) {
                if (keyState.w) sendPaddleMovement(3, 'up');
                if (keyState.s) sendPaddleMovement(3, 'down');
            }
            else if (isPlayer4) {
                if (keyState.w) sendPaddleMovement(4, 'up');
                if (keyState.s) sendPaddleMovement(4, 'down');
            }
            else if (isPlayer2){
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
                endGame(data);
            })
            .catch(error => {
                console.log(error);
            })
    }

    function escapeHtmlmain(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeMap[match];
        });
    }

    function endGame(gameDetails) {
        let message;
        isPlayer1 = false;
        isPlayer2 = false;
        isPlayer3 = false;
        isPlayer4 = false;
        if (gameDetails && gameDetails.is_finished) {
            const { nb_players, results } = gameDetails;

            if (nb_players === 2) {
                message = t('PlayerWin') + escapeHtmlmain(results.winners);
            } else if (nb_players === 4) {
                message = t('TeamWins') + escapeHtmlmain(results.winners);
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

            if (!isTournamentGame) {
                const playForm = document.getElementById('playForm');
                if (playForm) {
                    playForm.classList.remove('d-none');
                }
                navigateTo('Jeu de Pong', '/', 'The game has been terminated.');
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            isTournamentGame = false;

            const closeButton = document.querySelector('#gameModal .btn-close');
            if (closeButton) {
                closeButton.style.display = '';
            }
        }, 1000);
    }

    document.addEventListener('DOMContentLoaded', function() {
        gameModal = new bootstrap.Modal(document.getElementById('gameModal'));

        document.getElementById('gameModal').addEventListener('hidden.bs.modal', function () {
            // isPlayer1 = false; //rajouter apres le merge
            terminateGame();
            navigateTo('Jeu de Pong', '/', 'The game has been terminated.');
        });

        document.getElementById('playForm').addEventListener('submit', function(event) {
            event.preventDefault();

            const gameMode = document.querySelector('input[name="game_mode"]:checked').value;

            let remote, nbPlayers;

            switch (gameMode) {
                case 'remote_1v1':
                    remote = true;
                    nbPlayers = 2;
                    break;
                case 'remote_2v2':
                    remote = true;
                    nbPlayers = 4;
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

            if (remote) {
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
            fetch('/api/play/list')
                .then(response => response.json())
                .then(games => {
                    const filteredGames = games.filter(game => game.nb_players === nbPlayers && game.player_connected > 0);

                    if (filteredGames.length > 0) {
                        displayAvailableGames(filteredGames, nbPlayers);
                    } else {
                        createNewGame(true, nbPlayers);
                    }
                })
                .catch(error => {
                    createNewGame(true, nbPlayers);
                });
        }

        function displayAvailableGames(games, nbPlayers) {
            let container = document.querySelector('.main-content');
            if (!container) {
                container = document.createElement('div');
                container.className = 'main-content';
                document.body.insertBefore(container, document.getElementById('gameModal'));
            }

            container.style.display = 'block';
            container.innerHTML = '';

            const title = document.createElement('h1');
            title.textContent = nbPlayers === 2 ? 'Available 1v1 Games' : 'Available 2v2 Games';
            container.appendChild(title);

            if (games.length > 0) {
                const gameList = document.createElement('ul');
                games.forEach(game => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `Game ${game.id} (${game.player_connected}/${game.nb_players} players)`;
                    // if (game.player_connected == 1)
                    // {
                    //     isPlayer2 = true;
                    // }
                    // else if(game.player_connected == 2)
                    // {
                    //     isPlayer3 = true;
                    // }
                    // else if(game.player_connected == 3)
                    // {
                    //     isPlayer4 = true;
                    // }
                    //Ajoute Post Merge
                    listItem.addEventListener('click', () => {
                        if (game.player_connected == 1) {
                            isPlayer2 = true;
                        }
                        else if (game.player_connected == 2) {
                            isPlayer3 = true;
                        }
                        else if (game.player_connected == 3) {
                            isPlayer4 = true;
                        }
                        joinGame(game.id);
                        container.style.display = 'none';
                    });
                    // listItem.addEventListener('click', () => {
                    //     joinGame(game.id);
                    //     container.style.display = 'none';
                    // });
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
                createNewGame(true, nbPlayers);
                container.style.display = 'none';
            });
            container.appendChild(newGameButton);

        }

        function joinGame(gameId) {

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
            const data = {
                remote: remote,
                nb_players: nbPlayers
            };


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
                });

                const currentLanguage = localStorage.getItem('language') || 'fr';
                languageSelector.value = currentLanguage;
            }
        }

        window.addEventListener('popstate', (e) => {
            const tournamentModalPresent = document.getElementById('tournamentFullScreenModal');

            if (tournamentModalPresent) {
                e.preventDefault();
                handleTournamentBackNavigation();
                return;
            }

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
        initializeGame: initializeGame,
        fetchGameDetails: fetchGameDetails,
        handleTournamentBackNavigation: handleTournamentBackNavigation
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = PongGame;
} else {
    window.PongGame = PongGame;
}
