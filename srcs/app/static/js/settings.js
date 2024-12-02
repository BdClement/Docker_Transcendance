// settings.js
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const settingsLink = document.getElementById('settingsLink');

async function loadUserProfile() {
    try {
        const response = await fetch('/api/userprofile/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
        });

        if (response.ok) {
            const userData = await response.json();
            document.getElementById('settingsUsername').value = userData.username || '';
            document.getElementById('settingsEmail').value = userData.email || '';
            document.getElementById('settingsAlias').value = userData.alias || '';
            
            const photoPreview = document.getElementById('photoPreview');
            if (photoPreview && userData.photoProfile) {
                photoPreview.src = userData.photoProfile;
                photoPreview.style.display = 'block';
            }
        } else {
            console.error('Failed to load user profile');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function updateUserProfile(formData) {
    try {
        const response = await fetch('/api/userprofileupdate/', {
            method: 'PUT',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            body: formData,
            credentials: 'include',
        });

        if (response.ok) {
            const result = await response.json();
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = t('profileUpdateSuccess');
            settingsForm.insertBefore(alertDiv, settingsForm.firstChild);
            setTimeout(() => alertDiv.remove(), 3000);
            updateProfileDisplay(result);
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

function updateProfileDisplay(userData) {
    const profilePhoto = document.querySelector('.profile-photo');
    if (profilePhoto && userData.photoProfile) {
        profilePhoto.src = userData.photoProfile;
    }

    const usernameDisplay = document.querySelector('.username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = userData.username;
    }

    const aliasDisplay = document.querySelector('.alias-display');
    if (aliasDisplay) {
        aliasDisplay.textContent = userData.alias;
    }
}

function opensettingsModal() {
    const modal = new bootstrap.Modal(settingsModal);
    loadUserProfile();
    modal.show();
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
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
    history.pushState(null, '', '/settings');
    opensettingsModal();
});

window.addEventListener('popstate', (event) => {
    if (window.location.pathname === '/settings') {
        opensettingsModal();
    } else {
        const modal = bootstrap.Modal.getInstance(settingsModal);
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