document.addEventListener('DOMContentLoaded', () => {
    const followingList = document.getElementById('followingList');
    const followersList = document.getElementById('followersList');
    const addFriendForm = document.getElementById('addFriendForm');
    const friendProfileModal = new bootstrap.Modal(document.getElementById('friendProfileModal'));
    const unfollowButton = document.getElementById('unfollowButton');

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

    function getProfilePictureUrl(username) {
        return `/static/images/${username}.jpg`;
    }

    function loadFriendLists() {

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
            followingList.innerHTML = data.map(user => `
                <li class="custom-list-group-item p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="profile-picture-small me-3" 
                                 style="width: 40px; height: 40px;
                                        border-radius: 50%;
                                        background-size: cover;
                                        background-position: center;
                                        background-image: url('${getProfilePictureUrl(user.username)}');">
                            </div>
                            <div>
                                <div class="fw-bold">${user.username}</div>
                                <small class="text-muted">${user.alias}</small>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm custom-btn view-profile" 
                                    style="background-color: #194452; color: #ad996d;" 
                                    data-user-id="${user.id}">
                                Voir profil
                            </button>
                            <button class="btn btn-sm custom-btn delete-friend" 
                                    style="background-color: #194452; color: #ad996d;"
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
            followersList.innerHTML = `<li class="custom-list-group-item text-danger">${t('loginToSeeFriends')}</li>`;
        });

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
                followersList.innerHTML = `<li class="custom-list-group-item text-muted">${t('noFollowers')}</li>` ;
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
                                        background-image: url('${getProfilePictureUrl(user.username)}');">
                            </div>
                            <div>
                                <div class="fw-bold">${user.username}</div>
                                <small class="text-muted">${user.alias}</small>
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
            followersList.innerHTML = `<li class="custom-list-group-item text-danger">${t('loginToSeeFriends')}</li>`;
        });
    }

    // Le reste du code reste identique...
    function attachEventListeners() {
        const deleteButtons = document.querySelectorAll('.delete-friend');
        deleteButtons.forEach(button => {
            button.addEventListener('click', handleDeleteFriend);
        });

        const profileButtons = document.querySelectorAll('.view-profile');
        profileButtons.forEach(button => {
            button.addEventListener('click', handleViewProfile);
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

    addFriendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const friendUsername = document.getElementById('friendUsername').value.trim();
        
        if (!friendUsername) {
            alert("Veuillez entrer un nom d'utilisateur");
            return;
        }

        fetch(`/api/users/${friendUsername}/`, {
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) throw new Error('Utilisateur non trouvé');
            return response.json();
        })
        .then(data => {
            if (!data.id) throw new Error('ID de l\'utilisateur non trouvé');
            
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
            if (!response.ok) {
                return response.json().then(data => {
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
            console.error('Erreur:', error);
            alert(error.message);
        });
    });

    unfollowButton.addEventListener('click', () => {
        const userId = unfollowButton.dataset.userId;
        fetch(`/api/suppfriend/${userId}/`, { 
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            alert(data.detail);
            friendProfileModal.hide();
            loadFriendLists();
        })
        .catch(error => {
            alert("Erreur lors du désabonnement");
        });
    });

    loadFriendLists();
});