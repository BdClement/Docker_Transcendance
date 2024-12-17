// auth.js
function updateCsrfToken() {
    return fetch('/api/get-csrf-token/', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        document.querySelector('[name=csrfmiddlewaretoken]').value = data.csrfToken;
    });
}

//requête avec le token CSRF à jour
function fetchWithCsrf(url, options = {}) {
    return updateCsrfToken()
        .then(() => {
            options.headers = options.headers || {};
            options.headers['X-CSRFToken'] = getCsrfToken();
            options.credentials = 'include';
            return fetch(url, options);
        });
}

function updateUserInfo(username, photoProfile) {
    let profilePictureElement = document.getElementById('profilePicture');

    if (username) {
        window.dispatchEvent(new Event('userLoggedIn'));

        let usernameDisplay = document.getElementById('usernameDisplay');
        if (!usernameDisplay) {
            usernameDisplay = document.createElement('div');
            usernameDisplay.id = 'usernameDisplay';
            profilePictureElement.parentNode.insertBefore(usernameDisplay, profilePictureElement.nextSibling);
        }
        usernameDisplay.textContent = username;

        document.getElementById('logoutButton').style.display = 'block';
        document.querySelector('.auth-button').style.display = 'none';

        if (photoProfile) {
            profilePictureElement.style.backgroundImage = `url(/static/images/${username}.jpg?timestamp=${Date.now()})`;
        } else {
            profilePictureElement.style.backgroundImage = 'url(/static/images/base_pfp.png)';
        }
    } else {
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.remove();
        }

        document.getElementById('logoutButton').style.display = 'none';
        document.querySelector('.auth-button').style.display = 'block';
        profilePictureElement.style.backgroundImage = 'url(/static/images/base_pfp.png)';
    }
}

function checkLoginStatus() {
    return fetchWithCsrf('/api/user/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("DATA :", data);
        if (data.username) {
            updateUserInfo(data.username, data.photoProfile, data.alias);
            
            if (data.languageFav) {
                let languageMap = {
                    "English": "en",
                    "Français": "fr", 
                    "Tiếng Việt": "viet"
                };
                
                const mappedLanguage = languageMap[data.languageFav];
                if (mappedLanguage) {
                    localStorage.setItem('language', mappedLanguage);
                    document.getElementById('language').value = mappedLanguage;
                    applyTranslations();
                }
            }
        } else {
            updateUserInfo(null);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        updateUserInfo(null);
    });
}

function login(username, password) {
    return fetchWithCsrf('/api/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Connexion réussie") {
            updateUserInfo(data.user.username, data.user.photoProfile);
            checkLoginStatus();
            return data.user;
        } else {
            throw new Error(data.message);
        }
    });
}

function signup(formData) {
    return fetchWithCsrf('/api/signup/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Inscription réussie") {
            updateUserInfo(data.user.username, data.user.photoProfile, data.user.alias);
            checkLoginStatus();
            return data.user;
        } else {
            // throw new Error(data.message);
            throw new Error(JSON.stringify(data.errors));
        }
    });
}

function logout() {
    return fetchWithCsrf('/api/logout/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Déconnexion réussie") {
            updateUserInfo(null);
            window.dispatchEvent(new Event('userLoggedOut'));

        } else {
            throw new Error(data.message);
        }
    });
}

// Cette variable va contenir les messages d'erreur en fonction de la langue
let errorMessages = {};

//Ajoute par Clement pour la traduction des erreurs de signUp [ pas propre mais plus simple ]
function setErrorMessages() {
    const userLanguage = localStorage.getItem('language') || 'fr';
    console.log('UL== ', userLanguage);
    if (userLanguage === 'fr') {
        errorMessages = {
            'This password is too short. It must contain at least 8 characters., This password is too common.': 'Ce mot de passe est trop court. Il doit contenir au moins 8 caracteres.',
            'This password is too short. It must contain at least 8 characters.': 'Ce mot de passe est trop court. Il doit contenir au moins 8 caracteres.',
            'Cet email est deja utilisé.': 'Cet email est deja utilisé.',
            'Ce nom d\'utilisateur est deja utilisé.': 'Ce nom d\'utilisateur est deja utilisé.',
            'Cet alias est deja utilisé.': 'Cet alias est deja utilisé.',
            'Le mot de passe doit contenir au moins une lettre minuscule.': 'Le mot de passe doit contenir au moins une lettre minuscule',
            'Le mot de passe doit contenir au moins une lettre majuscule.': 'Le mot de passe doit contenir au moins une lettre majuscule',
            'Le mot de passe doit contenir au moins un chiffre.': 'Le mot de passe doit contenir au moins un chiffre.',
            'Le mot de passe doit contenir au moins un caractère spécial (par exemple @, #, $, %, etc.).': 'Le mot de passe doit contenir au moins un caractère spécial (@, #, $, %, etc.)'
        };
    } else if (userLanguage === 'en') {
        errorMessages = {
            'This password is too short. It must contain at least 8 characters., This password is too common.': 'This password is too short. It must contain at least 8 characters.',
            // 'This password is too short. It must contain at least 8 characters.'
            'This password is too short. It must contain at least 8 characters.': 'This password is too short. It must contain at least 8 characters.',
            'Cet email est deja utilisé.': 'Email already used',
            'Ce nom d\'utilisateur est deja utilisé.': 'Username already used',
            'Cet alias est deja utilisé.': 'Alias name already used',
            'Le mot de passe doit contenir au moins une lettre minuscule.': 'Password must contain at least a lowercase letter',
            'Le mot de passe doit contenir au moins une lettre majuscule.': 'Password must contain at least a capital letter',
            'Le mot de passe doit contenir au moins un chiffre.': 'Password must contain at least a number',
            'Le mot de passe doit contenir au moins un caractère spécial (par exemple @, #, $, %, etc.).': 'Password must contain at least a special character (@, #, $, %, etc.)'
        };
    } else if (userLanguage === 'viet') {
        errorMessages = {
            'This password is too short. It must contain at least 8 characters., This password is too common.': 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa',
            'This password is too short. It must contain at least 8 characters.': 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa',
            'Cet email est deja utilisé.': 'Email đã được sử dụng',
            'Ce nom d\'utilisateur est deja utilisé.': 'Tên người dùng đã được sử dụng',
            'Cet alias est deja utilisé.': 'Tên biệt danh đã được sử dụng',
            'Le mot de passe doit contenir au moins une lettre minuscule.': 'Mật khẩu phải chứa ít nhất một chữ cái viết thường',
            'Le mot de passe doit contenir au moins une lettre majuscule.': 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa',
            'Le mot de passe doit contenir au moins un chiffre.': 'Mật khẩu phải chứa ít nhất một số',
            'Le mot de passe doit contenir au moins un caractère spécial (par exemple @, #, $, %, etc.).': 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (@, #, $, %, v.v.)'
        };
    }
}


document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutButton = document.getElementById('logoutButton');
    const authModal = document.getElementById('authModal');

    document.querySelector('.auth-button').addEventListener('click', function() {
        history.pushState({}, '', '/connexion');
    });

    authModal.addEventListener('hidden.bs.modal', function() {
        history.pushState({}, '', '/');
    });

    window.addEventListener('popstate', function() {
        const modal = bootstrap.Modal.getInstance(authModal);
        if (modal) {
            modal.hide();
        }
    });

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        login(username, password)
            .then(() => {
                const authModal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                authModal.hide();
            })
            .catch(error => {
                console.error('Error:', error);
                const userLanguage = localStorage.getItem('language') || 'fr';
                if (userLanguage === 'fr') {
                    alert('Erreur de connexion: ' + 'L\'identifiant ou mot de passe est incorrect. Veuillez réessayer');
                } else if (userLanguage === 'en') {
                    alert('Error: ' + 'Login or password is incorrect. Please try again');
                } else if (userLanguage === 'viet') {
                    alert('Lỗi kết nối: Tên người dùng hoặc mật khẩu không chính xác. Vui lòng thử lại');
                }
            });
    });

    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        signup(formData)
            .then(() => {
                alert('Inscription réussie');
                const authModal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                authModal.hide();
            })
            .catch(error => {
                console.error('Error:', error);
                let errorMessage = '';
                // On vérifie si l'erreur est un objet Error et contient un message
                if (error.message) {
                    try {
                        const errorData = JSON.parse(error.message);

                        // Si l'objet contient des erreurs (data.errors), on les parcourt
                        if (errorData) {
                            for (let field in errorData) {
                                if (errorData.hasOwnProperty(field)) {
                                    // Ajout de chaque message d'erreur sans le nom du champ
                                    errorMessage += `${errorData[field].join(', ')}\n`;
                                }
                            }
                        }
                        // else {
                        //     // Si pas d'erreurs spécifiques, affiche le message directement
                        //     errorMessage += 'Détails de l\'erreur inconnus.';
                        // }
                    } catch (e) {
                        // Si le parsing échoue (le format n'est pas du JSON), on ajoute un message générique
                        errorMessage += 'Erreur inconnue';
                    }
                }
            console.log('error message : ', errorMessage);
            setErrorMessages();
            // Affichage du message d'erreur
            console.log('errorMessages[errorMessage] : ', errorMessages[errorMessage.trim()]);
            if (errorMessages[errorMessage.trim()]) {
                console.log('rentre dans le if : ', errorMessages[errorMessage.trim()]);
                alert(errorMessages[errorMessage.trim()]);
            } else {
                alert(errorMessage);
                console.log('rentre dans le else : ', errorMessages[errorMessage.trim()]);
            }
        });
    });

    logoutButton.addEventListener('click', function() {
        logout()
            .then(() => {
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de déconnexion: ' + error.message);
            });
    });
});