document.addEventListener('DOMContentLoaded', () => {
    const friendModal = document.getElementById('friendModal');
    const friendModalTrigger = document.querySelector('[data-bs-target="#friendModal"]');

    function escapeHtmlFriend(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function updateUrlForFriendModal() {
        history.pushState({ page: 'friends' }, '', '/friend');
    }

    function resetUrlAfterFriendModal() {
        history.pushState({ page: 'home' }, '', '/');
    }

    function handlePopState(event) {
        if (event.state) {
            if (event.state.page === 'friends') {
                const friendModalInstance = bootstrap.Modal.getInstance(friendModal) || new bootstrap.Modal(friendModal);
                friendModalInstance.show();
            } else if (event.state.page === 'home') {
                const friendModalInstance = bootstrap.Modal.getInstance(friendModal);
                if (friendModalInstance) {
                    friendModalInstance.hide();
                }
            }
        }
    }

    if (friendModalTrigger) {
        friendModalTrigger.addEventListener('click', updateUrlForFriendModal);
    }

    friendModal.addEventListener('hidden.bs.modal', resetUrlAfterFriendModal);
    window.addEventListener('popstate', handlePopState);
    const friendProfileModal = new bootstrap.Modal(document.getElementById('friendProfileModal'));

    // Ajoute par Clement
    const modalBody = document.getElementById('friendModalBody');
    function updateFriendModalBody() {
        modalBody.innerHTML = `
            <div class="custom-tabs-container">
                <ul class="nav nav-pills nav-fill" id="friendTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active custom-tab-button" id="friend-list-tab" data-bs-toggle="pill" data-bs-target="#friend-list" type="button" role="tab" aria-controls="friend-list" aria-selected="true" data-i18n="friendListTab">Liste d'amis</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link custom-tab-button" id="add-friend-tab" data-bs-toggle="pill" data-bs-target="#add-friend" type="button" role="tab" aria-controls="add-friend" aria-selected="false" data-i18n="addFriendTab">Ajouter un ami</button>
                    </li>
                </ul>
            </div>
            <div class="tab-content custom-tab-content" id="friendTabsContent">
                <div class="tab-pane fade show active" id="friend-list" role="tabpanel" aria-labelledby="friend-list-tab">
                    <h6 class="friend-list-title" data-i18n="yourFollowing">Vos abonnements</h6>
                    <ul id="followingList" class="list-group custom-list-group">
                    </ul>
                    <h6 class="friend-list-title" data-i18n="yourFollowers">Vos abonnés</h6>
                    <ul id="followersList" class="list-group custom-list-group">
                    </ul>
                </div>
                <div class="tab-pane fade" id="add-friend" role="tabpanel" aria-labelledby="add-friend-tab">
                    <form id="addFriendForm" class="mt-3">
                        <div class="mb-3">
                            <p for="friendUsername" class="form-label" data-i18n="addFriendUsername">Nom d'utilisateur de l'ami</p>
                            <input type="text" class="form-control custom-input" id="friendUsername" required>
                        </div>
                        <button type="submit" class="btn btn-primary custom-btn" data-i18n="addFriendButton">Ajouter</button>
                    </form>
                </div>
            </div>
        `;

        // Immediately set up the form listener after updating the modal body
        const addFriendForm = document.getElementById('addFriendForm');
        if (addFriendForm) {
            addFriendForm.addEventListener('submit', handleAddFriend);
        }
    }

    function handleAddFriend(e) {
        e.preventDefault();
        const friendUsername = document.getElementById('friendUsername').value.trim();

        if (!friendUsername) {
            alert(t('errorFriend'));
            return;
        }

        const validFriendUsername = validateInput(friendUsername, 'username');

        if (!validFriendUsername || validFriendUsername == "1") {
            throw alert(t('invalidFriendName'));
        }

        console.log('Attempting to add friend:', friendUsername);

        fetch(`/api/users/${friendUsername}/`, {
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            },
            credentials: 'same-origin'
        })
        .then(response => {
            console.log('User search response:', response);
            if (!response.ok) throw new Error('L\'utilisateur n\'existe pas');
            return response.json();
        })
        .then(data => {
            console.log('User data:', data);
            if (!data.id) throw new Error('ID de l\'utilisateur n\'existe pas');

            return fetch(`/api/addfriend/${data.id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                credentials: 'same-origin'
            });
        })
        .then(response => {
            console.log('Add friend response:', response);
            if (!response.ok) {
                return response.json().then(data => {
                    console.error('Error response:', data);
                    throw new Error(data.detail || 'Erreur lors de l\'ajout');
                });
            }
            return response.json();
        })
        .then(data => {
            alert(data.detail);
            document.getElementById('friendUsername').value = '';
            loadFriendLists();
        })
        .catch(error => {
            console.error('Erreur complète:', error);
            // alert(error.message);
            alert(t('userNotFound'));
        });
    }

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .custom-list-group-item {
            list-style-type: none;
        }
        #followingList, #followersList {
            padding-left: 0;
        }
    `;
    document.head.appendChild(styleSheet);

    window.addEventListener('userLoggedIn', () => {
        console.log('User logged in event detected, loading friend lists...');
        loadFriendLists();
    });

    function loadFriendLists() {

        //Ajoute par Clement Car en haut ce ne fonctionne plus puisque jai modifier index.html
        updateFriendModalBody();
        const followingList = document.getElementById('followingList');
        const followersList = document.getElementById('followersList');
        console.log('Appel apiFollowing');
        fetch('/api/following/', {
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) throw new Error('Erreur lors du chargement des amis');
            return response.json();
        })
        .then(data => {
            console.log('Lappel a lAPI fonctionne donc jaffiche le modalFriend');

            followingList.innerHTML = data.map(user => `
                <li class="custom-list-group-item p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="profile-picture-small me-3"
                                style="width: 40px; height: 40px;
                                        border-radius: 50%;
                                        background-size: cover;
                                        background-position: center;
                                        background-image: url('${profileView.getProfilePictureUrl(user.username)}');">
                            </div>
                            <div>
                                <div class="fw-bold">${escapeHtmlUser(user.username)}</div>
                                <small class="text-muted">${escapeHtmlUser(user.alias)}</small>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm custom-btn view-profile"
                                    style="background-color: #194452; color: #ad996d;"
                                    data-i18n="seeProfile"
                                    data-user-id="${user.id}">
                                Voir profil
                            </button>
                            <button class="btn btn-sm custom-btn delete-friend"
                                    style="background-color: #194452; color: #ad996d;"
                                    data-i18n="unfollowButton"
                                    data-user-id="${user.id}">
                                Ne plus suivre
                            </button>
                        </div>
                    </div>
                </li>
            `).join('');
            attachEventListeners();
        })
        .catch(error => {
            modalBody.innerHTML = `
                <div class="auth-message">
                    <i class="fas fa-lock"></i>
                    <p data-i18n="loginToSeeFriends">Aucune information utilisateur disponible</p>
                </div>`;
            return; //Pas d'appel a la deuxieme API
        });

        //J'expose la fonction au contexte global pour ne pas trop modifier le front mais acceder a cette fonction pour la deconnexion
        window.loadFriendLists = loadFriendLists;

        fetch('/api/followers/', {
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) throw new Error('Erreur lors du chargement des followers');
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                followersList.innerHTML = `<li class="custom-list-group-item text-muted" data-i18n="noFollowers">Aucun abonné</li>` ;
                return;
            }

            followersList.innerHTML = data.map(user => `
                <li class="custom-list-group-item p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="profile-picture-small me-3"
                                style="width: 40px; height: 40px;
                                        border-radius: 50%;
                                        background-size: cover;
                                        background-position: center;
                                        background-image: url('${profileView.getProfilePictureUrl(user.username)}');">
                            </div>
                            <div>
                                <div class="fw-bold">${escapeHtmlUser(user.username)}</div>
                                <small class="text-muted">${escapeHtmlUser(user.alias)}</small>
                            </div>
                        </div>
                        <button class="btn btn-sm custom-btn view-profile"
                                style="background-color: #194452; color: #ad996d;"
                                data-user-id="${user.id}">
                            Voir profil
                        </button>
                    </div>
                </li>
            `).join('');
            attachEventListeners();
        })
        .catch(error => {
            modalBody.innerHTML = `
            <div class="auth-message">
                <i class="fas fa-lock"></i>
                <p data-i18n="loginToSeeFriends">Aucune information utilisateur disponible</p>
            </div>`;
        });
    }

    function attachEventListeners() {
        const deleteButtons = document.querySelectorAll('.delete-friend');
        deleteButtons.forEach(button => {
            button.addEventListener('click', handleDeleteFriend);
        });

        const profileButtons = document.querySelectorAll('.view-profile');
        profileButtons.forEach(button => {
            button.addEventListener('click', profileView.handleViewProfile);
        });
    }

    function handleDeleteFriend(e) {
        e.preventDefault();
        const userId = e.target.getAttribute('data-user-id');

        if (!userId) return;

        if (confirm('Êtes-vous sûr de ne plus vouloir suivre cet utilisateur ?')) {
            fetch(`/api/suppfriend/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) throw new Error('Erreur lors de la suppression');
                return response.json();
            })
            .then(data => {
                alert(data.detail);
                loadFriendLists();
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert("Une erreur est survenue lors de la suppression");
            });
        }
    }

    function getCookie(name) {
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

    updateFriendModalBody();
    loadFriendLists();
});

const profileView = (function() {

    const unfollowButton = document.getElementById('unfollowButton');
    const friendProfileModal = new bootstrap.Modal(document.getElementById('friendProfileModal'));

    function getProfilePictureUrl(username) {
        return `/static/images/${username}.jpg`;
    }

    function handleViewProfile(e) {
        e.preventDefault();
        const userId = e.target.getAttribute('data-user-id');
        console.log(userId);
        if (userId) {
            fetch(`/api/userprofile/${userId}/`)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('friendProfileContent').innerHTML = `
                        <div class="text-center mb-3">
                            <div class="profile-picture-large mx-auto mb-2" 
                                 style="width: 100px; height: 100px; 
                                        border-radius: 50%;
                                        background-size: cover;
                                        background-position: center;
                                        background-image: url('${getProfilePictureUrl(data.username)}');">
                            </div>
                            <h4>${data.username}</h4>
                            <p class="text-muted">${data.alias}</p>
                        </div>
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
                    `;
                    unfollowButton.dataset.userId = userId;
                    friendProfileModal.show();
                });
        }
    }

    return {
        handleViewProfile,
        getProfilePictureUrl
    };
})();
