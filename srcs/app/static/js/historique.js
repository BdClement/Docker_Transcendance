// Déclaration des constantes pour les éléments du DOM
const historiqueModal = document.getElementById('historiqueModal');
const historiqueForm = document.getElementById('historiqueForm');
const historiqueLink = document.getElementById('historiqueLink');

async function loadMatchHistory(page = 1) {
    try {
        const response = await fetch(`/api/user/match-history/?page=${page}`, {
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            historiqueForm.innerHTML = `
                <div class="auth-message">
                    <i class="fas fa-lock"></i>
                    <p data-i18n="authRequired">Connectez-vous pour accéder à votre historique de parties</p>
                </div>`;
            return;
        }

        const data = await response.json();
        displayMatchHistory(data);
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
            <th data-i18n="date">Date</th>
            <th data-i18n="gameType">Type</th>
            <th data-i18n="winners">Gagnants</th>
            <th data-i18n="losers">Perdants</th>
            <th data-i18n="score">Score</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    data.results.forEach(match => {
        const row = document.createElement('tr');
        
        const date = new Date(match.date).toLocaleDateString();
        
        const matchResults = match.results;
        const winners = matchResults.winners ? matchResults.winners.join(', ') : '-';
        const losers = matchResults.losers ? matchResults.losers.join(', ') : '-';
        const score = matchResults.score || '-';
        const gameType = `${match.nb_players}j`;
        
        row.innerHTML = `
            <td class="date-cell">${date}</td>
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
    
    if (data.count > 10) {
        const pagination = createPagination(data);
        historiqueForm.appendChild(pagination);
    }
}

function createPagination(data) {
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-container d-flex justify-content-center mt-3';
    
    const totalPages = Math.ceil(data.count / 10);
    const currentPage = Math.floor(data.results.length / 10) + 1;
    
    const pagination = document.createElement('nav');
    pagination.innerHTML = `
        <ul class="pagination">
            ${Array.from({ length: totalPages }, (_, i) => i + 1)
                .map(page => `
                    <li class="page-item ${page === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${page}">${page}</a>
                    </li>
                `).join('')}
        </ul>
    `;
    
    pagination.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('page-link')) {
            const page = e.target.dataset.page;
            loadMatchHistory(page);
        }
    });
    
    paginationDiv.appendChild(pagination);
    return paginationDiv;
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