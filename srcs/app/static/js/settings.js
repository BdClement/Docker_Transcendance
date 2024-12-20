function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function sanitizeAttribute(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/javascript:/gi, '')
                .replace(/onerror=/gi, '')
                .replace(/<script.*?>.*?<\/script>/gi, '')
                .replace(/on\w+=/gi, '');
}

const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const errorMessage = document.getElementById('errorMessage');
const settingsLink = document.getElementById('settingsLink');
const settingsNewPassword = document.getElementById('settingsNewPassword');
const settingsConfirmPassword = document.getElementById('settingsConfirmPassword');

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.@,#$%^&+=!_\-])[A-Za-z\d.@,#$%^&+=!_\-]{8,}$/;
    return passwordRegex.test(password);
}

function setInitialLanguagePreference() {
    const savedLanguage = sanitizeAttribute(localStorage.getItem('language') || 'fr');
    const languageMap = {
        'en': '1',
        'fr': '2',
        'viet': '3'
    };

    const languagePreferenceSelect = document.getElementById('settingsLanguagePreference');
    if (languagePreferenceSelect) {
        languagePreferenceSelect.value = sanitizeAttribute(languageMap[savedLanguage] || '2');
    }
}

async function updateUserProfile(formData) {
    try {
        const username = formData.get('username');
        const email = formData.get('email');
        const alias = formData.get('alias');
        const password = formData.get('password');

        const validAlias = validateInput(alias, 'alias');
        const validUsername = validateInput(username, 'username');
        const validEmail = validateInput(email, 'email');
        const validPassword = validateInput(password, 'password');

        if (validUsername == "1" && username) {
            throw alert(t('invalidUsernameFormat'));
        }else if (validEmail == "1" && email) {
            throw alert(t('invalidEmailFormat'));
        }else if (validAlias == "1" && alias) {
            throw alert(t('invalidAliasFormat'));
        }else if (validPassword == "1" && password) {
            throw alert(t('invalidPasswordFormat'));
        }

        const sanitizedFormData = new FormData();

        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                if (value.size > 0) {
                    const sanitizedFileName = sanitizeAttribute(value.name);
                    const sanitizedFile = new File([value], sanitizedFileName, {
                        type: value.type,
                        lastModified: value.lastModified
                    });
                    sanitizedFormData.append(key, sanitizedFile);
                }
            } else if (typeof value === 'string') {
                const sanitizedValue = sanitizeAttribute(value);
                if (sanitizedValue !== '') {
                    sanitizedFormData.append(key, sanitizedValue);
                }
            }
        }

        const newPassword = sanitizedFormData.get('password');
        const confirmPassword = sanitizeAttribute(settingsConfirmPassword.value);
        const languagePreference = sanitizeAttribute(document.getElementById('settingsLanguagePreference').value);

        const languageMap = {
            '1': 'English',
            '2': 'Français',
            '3': 'Tiếng Việt'
        };
        const languagePreferenceText = sanitizeAttribute(languageMap[languagePreference] || 'Français');
        sanitizedFormData.append('languageFav', languagePreferenceText);

        if (newPassword) {
            if (!validatePassword(newPassword)) {
                throw new Error(t('invalidPasswordFormat'));
            }

            if (newPassword !== confirmPassword) {
                throw new Error(t('passwordsDoNotMatch'));
            }
        }

        const keys = [];
        for (let [key, value] of sanitizedFormData.entries()) {
            keys.push(key);
        }
        let languageFavIsSame = false;
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = sanitizedFormData.get(key);

            console.log('[avant delete] key == ', key);
            console.log(`Type de valeur pour ${key}:`, typeof value);

            if (value instanceof File) {
                console.log(`C'est un fichier: ${key}, taille: ${value.size}, nom: ${value.name}`);
            }
            if ((key === 'languagePreference' && value)) {
                const languageMap = {
                    '1': 'en',
                    '2': 'fr',
                    '3': 'viet'
                };
                const lang = localStorage.getItem('language');
                console.log('value === ', value);
                console.log('languageMap[value] == ', languageMap[value]);
                console.log('lang == ', lang);
                if (languageMap[value] === lang) {
                    console.log('Key supprimee (valeur vide) = ', key);
                    sanitizedFormData.delete(key);
                    languageFavIsSame = true;
                    i--;
                }
            }
            if (key === 'languageFav' && value && languageFavIsSame) {
                sanitizedFormData.delete(key);
                i--;
            }

            if (value instanceof File && value.size === 0) {
                console.log('Key supprimee (fichier vide) = ', key);
                sanitizedFormData.delete(key);
                i--;
            } else if (value === '') {
                console.log('Key supprimee (valeur vide) = ', key);
                sanitizedFormData.delete(key);
                i--;
            }
        }

        if (sanitizedFormData.keys().next().done) {
            throw new Error(t('noUpdateFieldsProvided'));
        }

        const response = await fetchWithCsrf('/api/userprofileupdate/', {
            method: 'PUT',
            body: sanitizedFormData,
            credentials: 'include',
        });

        // Escape HTML for logging to prevent XSS in console
        console.log("Réponse du serveur :", escapeHtml(response.status.toString()));

        const responseBody = await response.clone().json();
        console.log("Corps de la réponse :", escapeHtml(JSON.stringify(responseBody)));

        if (response.ok) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success';
            // Escape HTML for alert text
            alertDiv.textContent = escapeHtml(t('profileUpdateSuccess'));
            settingsForm.insertBefore(alertDiv, settingsForm.firstChild);
            setTimeout(() => alertDiv.remove(), 3000);

            settingsNewPassword.value = '';
            settingsConfirmPassword.value = '';

            const languageMap = {
                '1': 'en',
                '2': 'fr',
                '3': 'viet'
            };
            const selectedLanguage = sanitizeAttribute(languageMap[languagePreference] || 'fr');
            if (selectedLanguage) {
                localStorage.setItem('language', selectedLanguage);
                document.getElementById('language').value = selectedLanguage;
                applyTranslations();
            }
            checkLoginStatus();
        } else {
            // const error = await response.json();
            // throw new Error(error.detail || t('profileUpdateError'));
            // Traiter les erreurs spécifiques
            if (response.status === 400 && responseBody) {
                let errorMessages = [];
                if (responseBody.username) {
                    errorMessages.push(t('UsernameError'));
                }
                if (responseBody.alias) {
                    errorMessages.push(t('AliasError'));
                }
                if (responseBody.email) {
                    errorMessages.push(t('EmailError'));
                }
                console.log('errorMessages == ', errorMessages);
                if (errorMessages.length > 0) {
                    throw new Error(errorMessages.join(', '));
                }
            }
            // Si aucune erreur spécifique n'est trouvée, message générique
            throw new Error(t('profileUpdateError'));
        }
    } catch (error) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger';
        alertDiv.textContent = escapeHtml(error.message);
        settingsForm.insertBefore(alertDiv, settingsForm.firstChild);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

function opensettingsModal() {
    const modal = new bootstrap.Modal(settingsModal);

    fetchWithCsrf('/api/user/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            settingsForm.style.display = 'block';
            errorMessage.style.display = 'none';
            setInitialLanguagePreference();
        } else if (response.status === 401) {
            settingsForm.style.display = 'none';
            errorMessage.style.display = 'block';
        } else {
            throw new Error('Erreur inattendue lors de la vérification de l\'état de connexion.');
        }
    })
    .catch(error => {
        console.error('Erreur lors de la vérification de l\'état de connexion :', escapeHtml(error.toString()));
        settingsForm.style.display = 'none';
        errorMessage.style.display = 'block';
    });

    modal.show();
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);

    console.log("Contenu détaillé de formData :");
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`Détails du fichier ${escapeHtml(key)}:`, {
                name: escapeHtml(value.name),
                type: escapeHtml(value.type),
                size: escapeHtml(value.size.toString())
            });
        }
    }

    await updateUserProfile(formData);
});

const photoInput = document.getElementById('settingsPhoto');
if (photoInput) {
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const photoPreview = document.getElementById('photoPreview');
                if (photoPreview) {
                    photoPreview.src = e.target.result;
                    photoPreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState({ page: 'settings' }, '', '/settings');
    opensettingsModal();
});

window.addEventListener('popstate', (event) => {
    const modal = bootstrap.Modal.getInstance(settingsModal);
    if (window.location.pathname === '/settings') {
        opensettingsModal();
    } else {
        if (modal) {
            modal.hide();
        }
    }
});

settingsModal.addEventListener('hidden.bs.modal', () => {
    if (window.location.pathname === '/settings') {
        history.pushState(null, '', '/');
    }
});

if (window.location.pathname === '/settings') {
    opensettingsModal();
}
