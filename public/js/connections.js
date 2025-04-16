// public/js/connections.js

// Function to load all relevant connection lists when navigating to the Connections section
async function loadAllConnections() {
    // Use Promise.all for potentially faster parallel loading
    await Promise.all([
        loadConnectionsByType('pending_received', 'pending-received-list'),
        loadConnectionsByType('accepted', 'accepted-list'),
        loadConnectionsByType('pending_sent', 'pending-sent-list'),
        loadConnectionsByType('declined_sent', 'declined-sent-list'), // Requests declined by others
        loadConnectionsByType('declined_received', 'declined-received-list') // Requests declined by you
    ]).catch(error => {
        console.error("Error loading one or more connection lists:", error);
        showMessage('error', 'Could not load all connection details.');
    });
}

// Function to fetch connections of a specific type and render them into a specific list element
async function loadConnectionsByType(type, listId) {
    const listElement = document.getElementById(listId);
    if (!listElement) {
        console.error(`List element with ID ${listId} not found.`);
        return;
    }

    listElement.innerHTML = '<li>Loading...</li>'; // Show loading state

    try {
        const connections = await getConnections(type); // Call API
        renderConnectionList(connections, listId, type); // Render results
    } catch (error) {
        console.error(`Error loading ${type} connections:`, error);
        listElement.innerHTML = `<li class="error-message">Could not load ${type.replace(/_/g, ' ')}. ${error.message || ''}</li>`;
    }
}

// Function to render a list of connection items into the specified list element
function renderConnectionList(connections, listId, type) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;
    listElement.innerHTML = ''; // Clear loading/previous items

    // Determine default message based on type
    let emptyMessage = 'No connections found.';
    switch(type) {
        case 'pending_received': emptyMessage = 'No pending requests received.'; break;
        case 'accepted': emptyMessage = 'No active connections.'; break;
        case 'pending_sent': emptyMessage = 'No pending requests sent.'; break;
        case 'declined_sent': emptyMessage = 'No requests declined by recipients.'; break;
        case 'declined_received': emptyMessage = 'You have not declined any requests.'; break;
    }

    if (!connections || connections.length === 0) {
        listElement.innerHTML = `<li>${emptyMessage}</li>`;
        return;
    }

    const itemTemplate = document.getElementById('connection-item-template');
    const currentUserData = localStorage.getItem('mentorship_user');
    let currentUserId = null;
    try { currentUserId = JSON.parse(currentUserData)._id; }
    catch (e) { console.error("Failed to parse user data from localStorage"); }

    if (!currentUserId) {
         listElement.innerHTML = `<li class="error-message">Could not identify current user.</li>`;
         return; // Cannot proceed without current user ID
     }

    connections.forEach(conn => {
        // Basic check for required populated data
        if (!conn || !conn.requester || !conn.requester.name || !conn.recipient || !conn.recipient.name) {
            console.warn("Skipping connection item due to incomplete data:", conn);
            return; // Skip rendering if essential data is missing
        }

        const itemClone = itemTemplate.content.cloneNode(true);
        const listItem = itemClone.querySelector('.connection-item');
        const userInfo = listItem.querySelector('.user-info');
        const actionsContainer = listItem.querySelector('.actions');
        listItem.dataset.connectionid = conn._id; // Store connection ID on the item

        let otherUser;
        let itemDescription = ''; // To describe the relationship shown

        // Determine the other user and the context description based on the 'type'
        if (type === 'pending_received' || type === 'declined_received') {
            otherUser = conn.requester; // The one who sent the request
            itemDescription = `Request from`;
        } else if (type === 'pending_sent' || type === 'declined_sent') {
            otherUser = conn.recipient; // The one who received the request
            itemDescription = `Request to`;
        } else if (type === 'accepted') {
            // For accepted, show the person who is NOT the current user
            otherUser = conn.requester._id === currentUserId ? conn.recipient : conn.requester;
            itemDescription = `Connection with`;
        } else {
            // Fallback just in case type is unexpected (shouldn't happen with controller validation)
            otherUser = conn.requester._id === currentUserId ? conn.recipient : conn.requester;
            itemDescription = 'Interaction with';
        }

        // Populate user info - check if otherUser is valid
        if (!otherUser || !otherUser.name || !otherUser.role) {
            console.warn("Skipping connection item due to incomplete other user data:", otherUser, conn);
            return;
        }

        // Update user details display
        const itemDescriptionElement = userInfo.querySelector('.item-description');
        const userNameElement = userInfo.querySelector('.user-name');
        const userRoleElement = userInfo.querySelector('.user-role');
        const userBioElement = userInfo.querySelector('.user-bio');
        const userSkillsElement = userInfo.querySelector('.user-skills');
        const userInterestsElement = userInfo.querySelector('.user-interests');
        const statusElement = userInfo.querySelector('.status');

        if (itemDescriptionElement) itemDescriptionElement.textContent = itemDescription;
        if (userNameElement) userNameElement.textContent = otherUser.name;
        if (userRoleElement) userRoleElement.textContent = otherUser.role;
        
        // Add bio if available
        if (userBioElement) {
            if (otherUser.bio) {
                userBioElement.textContent = otherUser.bio;
            } else {
                userBioElement.textContent = 'No bio available';
            }
        }

        // Add skills if available
        if (userSkillsElement) {
            userSkillsElement.innerHTML = '<strong>Skills:</strong>'; // Reset content
            if (otherUser.skills && otherUser.skills.length > 0) {
                otherUser.skills.forEach(skill => {
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.textContent = skill;
                    userSkillsElement.appendChild(span);
                });
            } else {
                userSkillsElement.innerHTML += ' <span class="no-tags">No skills listed</span>';
            }
        }

        // Add interests if available
        if (userInterestsElement) {
            userInterestsElement.innerHTML = '<strong>Interests:</strong>'; // Reset content
            if (otherUser.interests && otherUser.interests.length > 0) {
                otherUser.interests.forEach(interest => {
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.textContent = interest;
                    userInterestsElement.appendChild(span);
                });
            } else {
                userInterestsElement.innerHTML += ' <span class="no-tags">No interests listed</span>';
            }
        }

        if (statusElement) statusElement.textContent = conn.status;

        // --- Define Action Buttons ---
        actionsContainer.innerHTML = ''; // Clear default/template buttons

        if (type === 'pending_received') {
            // Actions for requests received by current user
            const acceptBtn = createButton('Accept', 'btn-success', () => handleAcceptRequest(conn._id, listItem));
            const declineBtn = createButton('Decline', 'btn-danger', () => handleDeclineRequest(conn._id, listItem));
            actionsContainer.appendChild(acceptBtn);
            actionsContainer.appendChild(declineBtn);
        } else if (type === 'pending_sent') {
            // Action for requests sent by current user
            const cancelBtn = createButton('Cancel Request', 'btn-secondary', () => handleCancelRequest(conn._id, listItem));
            actionsContainer.appendChild(cancelBtn);
        } else if (type === 'accepted') {
            // Action for accepted connections (for either user)
            const removeBtn = createButton('Remove Connection', 'btn-danger', () => handleRemoveConnection(conn._id, listItem));
            actionsContainer.appendChild(removeBtn);
        }
        // No actions needed/rendered for 'declined_sent' or 'declined_received' types anymore.

        listElement.appendChild(listItem);
    });
}

// Helper function to create action buttons
function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `btn ${className} btn-sm`; // Use btn-sm for consistency in lists
    button.onclick = onClick; // Attach event handler
    return button;
}


// --- Action Handlers ---

// Handle Accept Request
async function handleAcceptRequest(connectionId, listItemElement) {
    disableActions(listItemElement); // Prevent double clicks
    try {
        await acceptConnectionRequest(connectionId);
        showMessage('success', 'Request accepted!');
        // Visually move or reload lists for accurate state
        listItemElement.remove(); // Remove from pending received
        // Reload accepted list to show the new connection
        loadConnectionsByType('accepted', 'accepted-list');
    } catch (error) {
        showMessage('error', `Failed to accept request: ${error.data?.message || error.message}`);
        enableActions(listItemElement); // Re-enable on error
    }
}

// Handle Decline Request
async function handleDeclineRequest(connectionId, listItemElement) {
    disableActions(listItemElement);
    try {
        await declineConnectionRequest(connectionId);
        showMessage('success', 'Request declined.');
        listItemElement.remove(); // Remove from pending received
        // Reload the list of requests declined by the current user
        loadConnectionsByType('declined_received', 'declined-received-list');
    } catch (error) {
        showMessage('error', `Failed to decline request: ${error.data?.message || error.message}`);
        enableActions(listItemElement);
    }
}

// Handle Cancel Sent Request (deletes pending connection)
async function handleCancelRequest(connectionId, listItemElement) {
    if (confirm('Are you sure you want to cancel this mentorship request?')) {
        disableActions(listItemElement);
        try {
            // Use the delete endpoint which now handles deleting pending/accepted
            await deleteConnection(connectionId);
            showMessage('success', 'Request cancelled.');
            listItemElement.remove(); // Remove from pending sent list
        } catch (error) {
            showMessage('error', `Failed to cancel request: ${error.data?.message || error.message}`);
            enableActions(listItemElement);
        }
    }
}

// Handle Remove Accepted Connection (deletes accepted connection)
async function handleRemoveConnection(connectionId, listItemElement) {
     if (confirm('Are you sure you want to remove this connection? This will remove it for both users.')) {
        disableActions(listItemElement);
        try {
            // Use the delete endpoint which now handles deleting pending/accepted
            await deleteConnection(connectionId);
            showMessage('success', 'Connection removed.');
            listItemElement.remove(); // Remove from accepted list
        } catch (error) {
            showMessage('error', `Failed to remove connection: ${error.data?.message || error.message}`);
            enableActions(listItemElement);
        }
    }
}

// (No handler needed for dismissing declined requests anymore)

// Helper functions to disable/enable buttons during API calls
function disableActions(listItemElement) {
    listItemElement.querySelectorAll('.actions button').forEach(btn => btn.disabled = true);
}
function enableActions(listItemElement) {
    listItemElement.querySelectorAll('.actions button').forEach(btn => btn.disabled = false);
}