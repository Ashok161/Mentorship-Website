const discoveryResultsContainer = document.getElementById('discovery-results');
const filterForm = document.getElementById('discovery-filter-form');
const resetFilterBtn = document.getElementById('reset-filter-btn');

async function loadDiscoveryUsers(filters = {}) {
    if (!discoveryResultsContainer) return;
    discoveryResultsContainer.innerHTML = '<p>Loading users...</p>'; // Show loading state

    try {
        const users = await discoverUsers(filters);
        renderUserCards(users);
    } catch (error) {
        showMessage('error', 'Failed to load users: ' + (error.message || 'Server Error'));
        discoveryResultsContainer.innerHTML = '<p class="error-message">Could not load users.</p>';
    }
}

function renderUserCards(users) {
     if (!discoveryResultsContainer) return;
    discoveryResultsContainer.innerHTML = ''; // Clear previous results or loading message

    if (users.length === 0) {
        discoveryResultsContainer.innerHTML = '<p>No users found matching your criteria.</p>';
        return;
    }

    const cardTemplate = document.getElementById('profile-card-template');

    users.forEach(user => {
        const cardClone = cardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('.profile-card');

        cardElement.querySelector('h3').textContent = user.name;
        cardElement.querySelector('.role').textContent = user.role;
        cardElement.querySelector('.bio').textContent = user.bio ? (user.bio.substring(0, 100) + (user.bio.length > 100 ? '...' : '')) : 'No bio.'; // Truncate bio


        const skillsContainer = cardElement.querySelector('.skills');
        skillsContainer.innerHTML = '<strong>Skills:</strong> '; // Reset default text
        if (user.skills && user.skills.length > 0) {
             user.skills.slice(0, 5).forEach(skill => { // Show limited tags
                 const tag = document.createElement('span');
                 tag.classList.add('tag');
                 tag.textContent = skill;
                 skillsContainer.appendChild(tag);
             });
             if(user.skills.length > 5) skillsContainer.appendChild(document.createTextNode(' ...'));
        } else {
            skillsContainer.appendChild(document.createTextNode(' None specified.'));
        }


        const interestsContainer = cardElement.querySelector('.interests');
         interestsContainer.innerHTML = '<strong>Interests:</strong> '; // Reset default text
         if (user.interests && user.interests.length > 0) {
              user.interests.slice(0, 5).forEach(interest => { // Show limited tags
                  const tag = document.createElement('span');
                  tag.classList.add('tag');
                  tag.textContent = interest;
                  interestsContainer.appendChild(tag);
              });
               if(user.interests.length > 5) interestsContainer.appendChild(document.createTextNode(' ...'));
         } else {
             interestsContainer.appendChild(document.createTextNode(' None specified.'));
         }


        const connectBtn = cardElement.querySelector('.connect-btn');
        connectBtn.dataset.userid = user._id;
        connectBtn.addEventListener('click', handleConnectClick);

        discoveryResultsContainer.appendChild(cardElement);
    });
}

async function handleConnectClick(event) {
    const button = event.target;
    const userId = button.dataset.userid;
    button.disabled = true; // Prevent double clicks
    button.textContent = 'Sending...';

    try {
        const result = await sendConnectionRequest(userId);
        showMessage('success', result.message || 'Request sent successfully!');
         button.textContent = 'Requested';
         button.classList.replace('btn-primary', 'btn-secondary');
         // Optionally remove the card or update its state further
    } catch (error) {
        showMessage('error', `Failed to send request: ${error.data?.message || error.message}`);
        button.textContent = 'Connect'; // Reset button text
        button.disabled = false; // Re-enable button
    }
}

// Filter form submission
if (filterForm) {
     filterForm.addEventListener('submit', (e) => {
         e.preventDefault();
         const filters = {
             role: document.getElementById('filter-role').value,
             skill: document.getElementById('filter-skill').value.trim(),
             interest: document.getElementById('filter-interest').value.trim(),
             search: document.getElementById('filter-search').value.trim()
         };
         // Remove empty filters
         Object.keys(filters).forEach(key => {
             if (!filters[key]) {
                 delete filters[key];
             }
         });
         loadDiscoveryUsers(filters);
     });
}

// Reset filter button
if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
        filterForm.reset(); // Reset form fields
        loadDiscoveryUsers(); // Load all users (or default filters)
    });
}