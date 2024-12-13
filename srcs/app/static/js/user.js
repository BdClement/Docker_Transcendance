const userModal = document.getElementById('userModal');
const userLink = document.getElementById('userLink');
const userForm = document.getElementById('userForm');

function updateCsrfToken2() {
    return fetch('/api/get-csrf-token/', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        document.querySelector('[name=csrfmiddlewaretoken]').value = data.csrfToken;
    });
}

function fetchWithCsrf2(url, options = {}) {
    return updateCsrfToken2()
        .then(() => {
            options.headers = options.headers || {};
            options.headers['X-CSRFToken'] = getCsrfToken();
            options.credentials = 'include';
            return fetch(url, options);
        });
}

function checkLoginStatus2() {
    return fetchWithCsrf2('/api/user/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .catch(error => {
        console.error('Error:', error);
        clearUserInfo();
        alert('An error occurred while fetching user information.');
    });
}

function getCookie2(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function updateUserInfo2(user) {
    fetch(`/api/users/${user.username}/`, {
        headers: {
            'X-CSRFToken': getCookie2('csrftoken'),
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) throw new Error(t('userNotFound'));
        return response.json();
    })
    .then(data => {
        if (!data.id) throw new Error(t('userIdNotFound'));
        const userId = data.id;

        fetch(`/api/userprofile/${userId}/`)
            .then(response => response.json())
            .then(data => {
                const userInfoForm = document.createElement('form');
                userInfoForm.innerHTML = `
                    <div class="row text-center">
                        <div class="col-4">
                            <h5>${data.nbVictoires + data.nbDefaites}</h5>
                            <small class="text-muted" data-i18n="games">Parties</small>
                        </div>
                        <div class="col-4">
                            <h5>${data.nbVictoires}</h5>
                            <small class="text-muted" data-i18n="victories">Victoires</small>
                        </div>
                        <div class="col-4">
                            <h5>${data.nbDefaites}</h5>
                            <small class="text-muted" data-i18n="defeats">Défaites</small>
                        </div>
                    </div>
                    <div class="mb-3">
                        <p class="form-label" data-i18n="username">Username</p>
                        <input type="text" class="form-control" value="${user.username}" disabled>
                    </div>
                    <div class="mb-3">
                        <p class="form-label" data-i18n="alias">Alias</p>
                        <input type="text" class="form-control" value="${user.alias}" disabled>
                    </div>
                    <div class="mb-3">
                        <p class="form-label" data-i18n="email">Email</p>
                        <input type="email" class="form-control" value="${user.email}" disabled>
                    </div>
                `;
                userForm.innerHTML = '';
                userForm.appendChild(userInfoForm);
                applyTranslations();
            });
    });
}
function clearUserInfo() {
    userForm.innerHTML = `
        <div class="auth-message">
            <i class="fas fa-lock"></i>
            <p data-i18n="noUserInfo">Aucune information utilisateur disponible</p>
        </div>
    `;
    applyTranslations();
}

function openuserModal() {
    const modal = new bootstrap.Modal(userModal);
    checkLoginStatus2()
        .then(user => {
            if (user && user.username) {
                updateUserInfo2(user);
            } else {
                clearUserInfo();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            clearUserInfo();
            alert(t('errorFetchingUser'));
        });
    modal.show();
}

window.addEventListener('userLoggedOut', function() {
    clearUserInfo();
    //clearFriendList
    loadFriendLists();//Ajoute par Clement
    const modal = bootstrap.Modal.getInstance(userModal);
    if (modal) {
        modal.hide();
    }
});

userLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState(null, '', '/user');
    openuserModal();
});

window.addEventListener('popstate', (event) => {
    if (window.location.pathname === '/user') {
        openuserModal();
    } else {
        const modal = bootstrap.Modal.getInstance(userModal);
        if (modal) {
            modal.hide();
        }
    }
});

userModal.addEventListener('hidden.bs.modal', () => {
    if (window.location.pathname === '/user') {
        history.pushState(null, '', '/');
    }
});

if (window.location.pathname === '/user') {
    openuserModal();
}
