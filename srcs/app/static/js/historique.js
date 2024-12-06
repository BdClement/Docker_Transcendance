const historiqueModal = document.getElementById('historiqueModal');
const historiqueForm = document.getElementById('historiqueForm');
const historiqueLink = document.getElementById('historiqueLink');

function loadMatchHistory() {
    try {
        fetch('/api/user/match-history/', {
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                historiqueForm.innerHTML = `
                    <div class="auth-message">
                        <i class="fas fa-lock"></i>
                        <p data-i18n="authRequired">Connectez-vous pour accéder à votre historique de parties</p>
                    </div>`;
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                console.log("DATA HISTORIQUE :", data);
                displayMatchHistory(data);
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            historiqueForm.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        });
    } catch (error) {
        console.error('Erreur:', error);
        historiqueForm.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
}

function displayMatchHistory(data) {
    historiqueForm.innerHTML = '';
    
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    
    const table = document.createElement('table');
    table.className = 'table table-striped match-history-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th data-i18n="dateTime">Date et Heure</th>
            <th data-i18n="gameType">Type</th>
            <th data-i18n="winners">Gagnants</th>
            <th data-i18n="losers">Perdants</th>
            <th data-i18n="score">Score</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    // Inverser l'ordre des matchs (du plus récent au plus ancien)
    // Limiter à 5 derniers matchs
    const displayedMatches = data.results.slice().reverse().slice(0, 5);
    
    displayedMatches.forEach(match => {
        const row = document.createElement('tr');
        
        // Create a Date object and format it to include both date and time
        const matchDate = new Date(match.date);
        const formattedDateTime = matchDate.toLocaleDateString() + ' ' + matchDate.toLocaleTimeString();
        
        const matchResults = match.results;
        const winners = matchResults.winners ? matchResults.winners.join(', ') : '-';
        const losers = matchResults.losers ? matchResults.losers.join(', ') : '-';
        const score = matchResults.score || '-';
        const gameType = t('playersCount', { count: match.nb_players });
        
        row.innerHTML = `
            <td class="datetime-cell">${formattedDateTime}</td>
            <td class="type-cell">${gameType}</td>
            <td class="players-cell" title="${winners}">${winners}</td>
            <td class="players-cell" title="${losers}">${losers}</td>
            <td class="score-cell">${score}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    tableWrapper.appendChild(table);
    historiqueForm.appendChild(tableWrapper);

    applyTranslations();
}

function openHistoriqueModal() {
    const modal = new bootstrap.Modal(historiqueModal);
    loadMatchHistory();
    modal.show();
}

historiqueLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', '/historique');
    openHistoriqueModal();
});

window.addEventListener('popstate', (event) => {
    if (window.location.pathname === '/historique') {
        openHistoriqueModal();
    } else {
        const modal = bootstrap.Modal.getInstance(historiqueModal);
        if (modal) {
            modal.hide();
        }
    }
});

historiqueModal.addEventListener('hidden.bs.modal', () => {
    if (window.location.pathname === '/historique') {
        history.pushState(null, '', '/');
    }
});

if (window.location.pathname === '/historique') {
    openHistoriqueModal();
}