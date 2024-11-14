const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const settingsLink = document.getElementById('settingsLink');

// Function to load user profile data
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
            // Fill the form with user data
            document.getElementById('settingsUsername').value = userData.username || '';
            document.getElementById('settingsEmail').value = userData.email || '';
            document.getElementById('settingsAlias').value = userData.alias || '';
            
            // If you have a preview for the profile photo
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

// Function to update user profile
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
            // Show success message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = 'Profile updated successfully!';
            settingsForm.insertBefore(alertDiv, settingsForm.firstChild);

            // Remove alert after 3 seconds
            setTimeout(() => alertDiv.remove(), 3000);

            // Update any profile information displayed on the page
            updateProfileDisplay(result);
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update profile');
        }
    } catch (error) {
        // Show error message
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger';
        alertDiv.textContent = error.message;
        settingsForm.insertBefore(alertDiv, settingsForm.firstChild);

        // Remove alert after 3 seconds
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Function to update profile display on the page
function updateProfileDisplay(userData) {
    // Update any elements that display user information
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
    loadUserProfile(); // Load user data when opening the modal
    modal.show();
}

// Handle form submission
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    await updateUserProfile(formData);
});

// Handle file input change for profile photo preview
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