const userModal = document.getElementById('userModal');
const userLink = document.getElementById('userLink');
const userProfilePictureElement = document.getElementById('userProfilePicture');
const userProfileUsernameElement = document.getElementById('userProfileUsername');
const userProfileAliasElement = document.getElementById('userProfileAlias');
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
        if (!response.ok) throw new Error('Utilisateur non trouvé');
        return response.json();
    })
    .then(data => {
        if (!data.id) throw new Error('ID de l\'utilisateur non trouvé');
        const userId = data.id;
        
        console.log(userId);
    fetch(`/api/userprofile/${userId}/`)
        .then(response => response.json())
        .then(data => {
            const userInfoForm = document.createElement('form');
            userInfoForm.innerHTML = `
                <div class="row text-center">
                    <div class="col-4">
                        <h5>${data.nbVictoires + data.nbDefaites}</h5>
                        <small class="text-muted">Parties</small>
                    </div>
                    <div class="col-4">
                        <h5>${data.nbVictoires}</h5>
                        <small class="text-muted">Victoires</small>
                    </div>
                    <div class="col-4">
                        <h5>${data.nbDefaites}</h5>
                        <small class="text-muted">Défaites</small>
                    </div>
                </div>
                <div class="mb-3">
                    <p class="form-label">Username</p>
                    <input type="text" class="form-control" value="${user.username}" disabled>
                </div>
                <div class="mb-3">
                    <p class="form-label">Alias</p>
                    <input type="text" class="form-control" value="${user.alias}" disabled>
                </div>
                <div class="mb-3">
                    <p class="form-label">Email</p>
                    <input type="email" class="form-control" value="${user.email}" disabled>
                </div>
            `;
            userForm.innerHTML = '';
            userForm.appendChild(userInfoForm);
        });
        
    })
    
}

function openuserModal() {
    const modal = new bootstrap.Modal(userModal);
    checkLoginStatus2()
        .then(updateUserInfo2)
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while fetching user information.');
        });
    modal.show();
}

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