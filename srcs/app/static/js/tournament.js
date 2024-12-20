const tournamentModal = document.getElementById('tournamentModal');
const tournamentForm = document.getElementById('tournamentForm');
const playerCountSelect = document.getElementById('playerCount');
const aliasInputs = document.getElementById('aliasInputs');
const tournamentLink = document.getElementById('tournamentLink');
const nextGameForm = document.getElementById('nextGameForm');

function escapeHtmlTournois(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showFullScreenTournamentModal() {

    const existingModal = document.getElementById('tournamentFullScreenModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'tournamentFullScreenModal';
    modal.className = 'modal show';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.style.cssText = `
        display: block; 
        background-color: rgba(13, 30, 41, 0.9); 
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        z-index: 2;
        overflow: hidden;
    `;

    modal.innerHTML = `
        <div class="modal-dialog modal-fullscreen" role="document" style="max-width: 100%; margin: 0; height: 100%; display: flex; align-items: flex-end; justify-content: center;">
            <div class="modal-content" style="
                height: auto; 
                width: 100%; 
                background: transparent; 
                box-shadow: none; 
                display: flex; 
                flex-direction: column; 
                align-items: center;
                padding-bottom: 20vh;
            ">
                <div class="modal-body text-center" style="color: #ad996d; text-align: center; width: 100%;">
                    <div class="spinner-border" role="status" style="
                        width: 3rem; 
                        height: 3rem; 
                        color: #ad996d; 
                        border-width: 0.25em;
                        margin-bottom: 20px;
                    ">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h2 class="mt-3" data-i18n="tournamentInProgress" style="
                        color: #ad996d; 
                        font-size: 2rem; 
                        margin-bottom: 15px;
                    ">Tournament in Progress</h2>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.zIndex = '2';

    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }

    return function closeFullScreenModal() {
        const modalToRemove = document.getElementById('tournamentFullScreenModal');
        if (modalToRemove) {
            modalToRemove.remove();
        }
    };
}

function openTournamentModal() {
    const modal = new bootstrap.Modal(tournamentModal);
    modal.show();
}

tournamentLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', '/tournaments');
    openTournamentModal();
});

window.addEventListener('popstate', (event) => {
    if (window.location.pathname === '/tournaments') {
        openTournamentModal();
    } else {
        const modal = bootstrap.Modal.getInstance(tournamentModal);
        if (modal) {
            modal.hide();
        }
    }
});

tournamentModal.addEventListener('hidden.bs.modal', () => {
    if (window.location.pathname === '/tournaments') {
        history.pushState(null, '', '/');
    }
});

playerCountSelect.addEventListener('change', updateAliasInputs);

function updateAliasInputs() {
    const playerCount = parseInt(playerCountSelect.value);
    aliasInputs.innerHTML = '';

    for (let i = 1; i <= playerCount; i++) {
        const input = document.createElement('div');
        input.classList.add('mb-3');
        input.innerHTML = `
            <p for="alias${i}" class="form-label" data-i18n="playerAlias" data-i18n-params='{"number":${i}}'>Alias du joueur ${escapeHtmlTournois(i.toString())}</p>
            <input type="text" class="form-control" id="alias${escapeHtmlTournois(i.toString())}" required>
        `;
        aliasInputs.appendChild(input);
    }
}

tournamentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const playerCount = parseInt(playerCountSelect.value);
    const aliasNames = [];

    for (let i = 1; i <= playerCount; i++) {
        const aliasInput = document.getElementById(`alias${i}`);
        if (aliasInput && aliasInput.value.trim() !== '') {
            aliasNames.push(aliasInput.value.trim());
        }
    }

    for (let index = 0; index < playerCount; index++) {

        const validAlias = validateInput(aliasNames[index], 'alias');

        if (!validAlias || validAlias == "1") {
            throw alert(t('invalidAliasFormat'));
        }
    }

    if (aliasNames.length !== playerCount) {
        alert(t('pleaseEnterValidAliases').replace('{count}', playerCount));
        return;
    }

    try {
        const response = await fetchWithCsrf('/api/tournaments/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({
                nb_players: playerCount,
                alias_names: aliasNames,
            }),
        });

        if (response.status === 201) {
            const tournamentData = await response.json();
            bootstrap.Modal.getInstance(tournamentModal).hide();
            startTournament(tournamentData.id);
        } else {
            const errorData = await response.json();
            alert(t('tournamentCreationError'));
        }
    } catch (error) {
        console.error('Erreur lors de la création du tournoi:', error);
        alert(t('tournamentCreationError'));
    }
});

async function startTournament(tournamentId) {
    const closeFullScreenModal = showFullScreenTournamentModal();
    let tournamentFinished = false;

    while (!tournamentFinished) {
        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/next-play/`);
            const data = await response.json();
            const test = await fetch(`/api/play/detail/${data.play_id}`);
            const data2 = await test.json();

            if (response.status === 200) {
                console.log(data2);
                console.log('Lancer la partie:', data.play_id);
                console.log('Joueurs:', data.players);
                await showNextGameModal(data2);
                const newUrl = `/game/${data.play_id}`;
                const newTitle = `Pong Game ${data.play_id}`;
                const newContent = `Playing Pong Game ${data.play_id}`;
                PongGame.navigateTo(newTitle, newUrl, newContent, data.play_id);
                PongGame.initializeGame(data.play_id, 2, true);
                await waitForGameCompletion(data.play_id);
            } else if (response.status === 410) {
                tournamentFinished = true;
                showNotification(
                    t('tournamentScoreStorageAttempt', {
                        tournamentId: tournamentId,
                        etherscanLink: etherscanLink,
                        contractAddress: contractAddress
                    }),
                    true
                );
                startLiseningToTournament(tournamentId);
                await displayTournamentResults(tournamentId);
                closeFullScreenModal();
            } else {
                throw new Error('Erreur inattendue');
            }
        } catch (error) {
            console.error('Erreur lors du déroulement du tournoi:', error);
            alert('Une erreur est survenue lors du déroulement du tournoi.');
            tournamentFinished = true;
            closeFullScreenModal();
        }
    }
}

function showNextGameModal(data) {
    return new Promise((resolve) => {
        const nextGameModal = document.getElementById('nextGameModal');
        const startNextGameButton = document.getElementById('startNextGameButton');
        const nextGameInfoForm = document.createElement('form');

        nextGameInfoForm.innerHTML = `
            <p>${t('nextGameVs', {
                player1: escapeHtmlTournois(data.player_name[0]),
                player2: escapeHtmlTournois(data.player_name[1])
            })}</p>
        `;
        nextGameForm.innerHTML = '';
        nextGameForm.appendChild(nextGameInfoForm);

        const modal = new bootstrap.Modal(nextGameModal, {
            backdrop: 'static',
            keyboard: false
        });

        const handleNextGame = () => {
            startNextGameButton.removeEventListener('click', handleNextGame);
            modal.hide();
            resolve();
        };

        startNextGameButton.addEventListener('click', handleNextGame);
        modal.show();
        applyTranslations();
    });
}

function waitForGameCompletion(playId) {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            PongGame.fetchGameDetails(playId)
                .then(gameDetails => {
                    if (gameDetails.is_finished) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                })
                .catch(error => {
                    console.error('Erreur lors de la vérification de l\'état du jeu:', error);
                    clearInterval(checkInterval);
                    resolve();
                });
        }, 15000);
    });
}

PongGame.fetchGameDetails = function(gameId) {
    return fetch(`/api/play/detail/${gameId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
};

async function displayTournamentResults(tournamentId) {
    try {
        const response = await fetch(`/api/tournaments/${tournamentId}/`);
        const data = await response.json();

        if (response.status === 200) {
            console.log('Résultats du tournoi:', data);
        } else {
            throw new Error('Erreur inattendue');
        }
    } catch (error) {
        console.error('Erreur lors de l\'affichage des résultats du tournoi:', error);
        alert('Une erreur est survenue lors de l\'affichage des résultats du tournoi.');
    }
}

updateAliasInputs();

if (window.location.pathname === '/tournaments') {
    openTournamentModal();
}
