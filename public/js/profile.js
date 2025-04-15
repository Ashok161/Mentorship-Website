let currentUserProfile = null; // Cache profile data

async function loadUserProfile() {
    try {
        const profile = await getUserProfile();
        currentUserProfile = profile; // Cache it
        displayProfile(profile);
        setupProfileEditButton(profile);
        setupDeleteProfileButton(); // Setup delete button listener
    } catch (error) {
        showMessage('error', 'Failed to load profile: ' + (error.message || 'Server Error'));
        // Handle error, maybe redirect or show static message
    }
}

function displayProfile(profile) {
    document.getElementById('profile-name').textContent = profile.name || 'N/A';
    document.getElementById('profile-email').textContent = profile.email || 'N/A';
    document.getElementById('profile-role').textContent = profile.role || 'N/A';
    document.getElementById('profile-bio').textContent = profile.bio || 'No bio provided.';

    renderTags('profile-skills', profile.skills);
    renderTags('profile-interests', profile.interests);

    // Ensure view is visible and edit is hidden
    document.getElementById('profile-view').style.display = 'block';
    document.getElementById('profile-edit').style.display = 'none';
}

 function renderTags(containerId, tags) {
     const container = document.getElementById(containerId);
     container.innerHTML = ''; // Clear previous tags
     if (tags && tags.length > 0) {
         tags.forEach(tagText => {
             const tagElement = document.createElement('span');
             tagElement.classList.add('tag');
             tagElement.textContent = tagText;
             container.appendChild(tagElement);
         });
     } else {
        const noTags = document.createElement('span');
        noTags.textContent = 'None specified.';
        noTags.style.fontStyle = 'italic';
        container.appendChild(noTags);
     }
 }


function setupProfileEditButton(profile) {
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-profile-btn');
    const profileView = document.getElementById('profile-view');
    const profileEdit = document.getElementById('profile-edit');
    const editForm = document.getElementById('edit-profile-form');

    editBtn.onclick = () => {
        // Populate edit form
        document.getElementById('edit-name').value = profile.name || '';
        document.getElementById('edit-role').value = profile.role || '';
        document.getElementById('edit-bio').value = profile.bio || '';
        // Initialize tag inputs
        initializeTagInput('edit-skills', profile.skills);
        initializeTagInput('edit-interests', profile.interests);

        profileView.style.display = 'none';
        profileEdit.style.display = 'block';
    };

    cancelBtn.onclick = () => {
        profileEdit.style.display = 'none';
        profileView.style.display = 'block';
         clearMessage('message-area'); // Clear any previous form messages
    };

    editForm.onsubmit = handleProfileUpdate;
}

async function handleProfileUpdate(event) {
     event.preventDefault();
     clearMessage('message-area');

     const updatedData = {
         name: document.getElementById('edit-name').value.trim(),
         role: document.getElementById('edit-role').value,
         bio: document.getElementById('edit-bio').value.trim(),
         // Retrieve tags from the hidden inputs managed by tag input logic
         skills: getTagsFromInput('edit-skills'),
         interests: getTagsFromInput('edit-interests')
     };

     // Basic validation
     if (!updatedData.name) {
         showMessage('error', 'Name cannot be empty.');
         return;
     }

     try {
         const updatedProfile = await updateUserProfile(updatedData);
         currentUserProfile = updatedProfile; // Update cache
         displayProfile(updatedProfile); // Update view
         showMessage('success', 'Profile updated successfully!');
     } catch (error) {
         showMessage('error', 'Failed to update profile: ' + (error.data?.message || error.message || 'Server Error'));
     }
}

// --- Tag Input Logic ---
function initializeTagInput(inputIdPrefix, initialTags = []) {
    const container = document.getElementById(`${inputIdPrefix}-container`);
    const input = document.getElementById(`${inputIdPrefix}-input`);
    const hiddenInput = document.getElementById(inputIdPrefix); // The hidden input storing the array

    // Clear existing tags in the container except the input field
    container.querySelectorAll('.tag').forEach(tagEl => tagEl.remove());

     const addTag = (tagText) => {
        tagText = tagText.trim();
        if (!tagText || getTagsFromInput(inputIdPrefix).includes(tagText)) { // Prevent empty/duplicates
             input.value = ''; // Clear input even if tag not added
            return;
        }

        const tagElement = document.createElement('span');
        tagElement.classList.add('tag');
        tagElement.textContent = tagText;

        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;'; // Multiplication sign as 'x'
        closeBtn.onclick = () => {
            tagElement.remove();
            updateHiddenInput();
        };
        tagElement.appendChild(closeBtn);

        container.insertBefore(tagElement, input); // Insert tag before the input field
        input.value = ''; // Clear the input field
        updateHiddenInput();
     };

    const updateHiddenInput = () => {
        const tags = Array.from(container.querySelectorAll('.tag'))
                          .map(tagEl => tagEl.textContent.slice(0, -1).trim()); // Remove '×' and trim
        hiddenInput.value = JSON.stringify(tags); // Store as JSON string (or comma-separated)
     };


     input.onkeydown = (e) => {
         if (e.key === 'Enter' || e.key === ',') {
             e.preventDefault(); // Prevent form submission or typing comma
             addTag(input.value);
         } else if (e.key === 'Backspace' && input.value === '') {
            // Optional: remove last tag on backspace if input is empty
            const lastTag = container.querySelector('.tag:last-of-type');
            if (lastTag) {
                lastTag.remove();
                updateHiddenInput();
            }
         }
     };

     // Add initial tags
     initialTags.forEach(addTag);
     updateHiddenInput(); // Set initial value for hidden input
}

function getTagsFromInput(inputIdPrefix) {
     const hiddenInput = document.getElementById(inputIdPrefix);
     try {
        // Try parsing as JSON first, fallback to splitting by comma if needed
         return JSON.parse(hiddenInput.value || '[]');
     } catch (e) {
         // Fallback for non-JSON or simple implementation
         // return (hiddenInput.value || '').split(',').map(t => t.trim()).filter(Boolean);
         console.warn("Could not parse hidden input value as JSON for", inputIdPrefix);
         return [];
     }
}
// --- End Tag Input Logic ---

function setupDeleteProfileButton() {
    const deleteBtn = document.getElementById('delete-profile-btn');
    deleteBtn.onclick = async () => {
        if (confirm('Are you absolutely sure you want to delete your profile? This action cannot be undone.')) {
             if(confirm('This will permanently remove your account and all associated data. Confirm again?')) {
                 try {
                     await deleteUserProfile();
                     localStorage.removeItem('mentorship_token');
                     localStorage.removeItem('mentorship_user');
                     showMessage('success', 'Profile deleted successfully. Redirecting...');
                     setTimeout(() => { window.location.href = '/index.html'; }, 2000);
                 } catch (error) {
                     showMessage('error', 'Failed to delete profile: ' + (error.data?.message || error.message || 'Server Error'));
                 }
             }
        }
    };
}