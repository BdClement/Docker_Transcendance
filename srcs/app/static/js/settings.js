const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const settingsLink = document.getElementById('settingsLink');
const settingsNewPassword = document.getElementById('settingsNewPassword');
const settingsConfirmPassword = document.getElementById('settingsConfirmPassword');

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.@,#$%^&+=!_\-])[A-Za-z\d.@,#$%^&+=!_\-]{8,}$/;
    return passwordRegex.test(password);
}

async function updateUserProfile(formData) {
    try {

        const newPassword = formData.get('password');
        const confirmPassword = settingsConfirmPassword.value;

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