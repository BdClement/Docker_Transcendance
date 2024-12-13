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
    const savedLanguage = localStorage.getItem('language') || 'fr';
    const languageMap = {
        'en': '1',
        'fr': '2',
        'viet': '3'
    };

    const languagePreferenceSelect = document.getElementById('settingsLanguagePreference');
    if (languagePreferenceSelect) {
        languagePreferenceSelect.value = languageMap[savedLanguage] || '2';
    }
}

async function updateUserProfile(formData) {
    try {

        const newPassword = formData.get('password');
        const confirmPassword = settingsConfirmPassword.value;
        const languagePreference = document.getElementById('settingsLanguagePreference').value;
        const languageMap = {
            '1': 'English',
            '2': 'Français',
            '3': 'Tiếng Việt'
        };
        const languagePreferenceText = languageMap[languagePreference];
        formData.append('languageFav', languagePreferenceText);

        if (newPassword) {
            if (!validatePassword(newPassword)) {
                throw new Error(t('invalidPasswordFormat'));
            }

            if (newPassword !== confirmPassword) {
                throw new Error(t('passwordsDoNotMatch'));
            }
        }

        for (let [key, value] of formData.entries()) {
            if (value === '') {
                formData.delete(key);
            }
        }

        if (formData.keys().next().done) {
            throw new Error(t('noUpdateFieldsProvided'));
        }

        const response = await fetchWithCsrf('/api/userprofileupdate/', {
            method: 'PUT',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            body: formData,
            credentials: 'include',
        });
        console.log("Réponse du serveur :", response);
        const responseBody = await response.clone().json();
        console.log("Corps de la réponse :", responseBody);

        if (response.ok) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = t('profileUpdateSuccess');
            settingsForm.insertBefore(alertDiv, settingsForm.firstChild);
            setTimeout(() => alertDiv.remove(), 3000);
            settingsNewPassword.value = '';
            settingsConfirmPassword.value = '';
            const languageMap = {
                '1': 'en',
                '2': 'fr',
                '3': 'viet'
            };
            const selectedLanguage = languageMap[languagePreference];
            if (selectedLanguage) {
                localStorage.setItem('language', selectedLanguage);
                document.getElementById('language').value = selectedLanguage;
                applyTranslations();
            }
            checkLoginStatus();
        } else {
            const error = await response.json();
            throw new Error(error.detail || t('profileUpdateError'));
        }
    } catch (error) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger';
        alertDiv.textContent = error.message;
        settingsForm.insertBefore(alertDiv, settingsForm.firstChild);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

function opensettingsModal() {
    const modal = new bootstrap.Modal(settingsModal);

    //Appel API uniquement pour voir si l'utilisateur est connecte. Pas propre mais plus simpla sans trop ajouter de changement
    fetchWithCsrf('/api/user/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            console.log('opensettingsModal: l\'utilisateur est connecte, on affiche le formulaire');
            settingsForm.style.display = 'block';
            errorMessage.style.display = 'none';
            setInitialLanguagePreference();
        } else if (response.status === 401) {
            console.log('opensettingsModal: l\'utilisateur n\'est pas connecte, on affiche le message d\'erreur');
            settingsForm.style.display = 'none';
            errorMessage.style.display = 'block';
        } else {
            throw new Error('Erreur inattendue lors de la vérification de l\'état de connexion.');
        }
    })
    .catch(error => {
        console.error('Erreur lors de la vérification de l\'état de connexion :', error);
        settingsForm.style.display = 'none';
        errorMessage.style.display = 'block';
    })
    modal.show();
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    console.log("Contenu détaillé de formData :");
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`Détails du fichier ${key}:`, {
                name: value.name,
                type: value.type,
                size: value.size
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
