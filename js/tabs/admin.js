// Admin panel functionality
export async function loadAdminPage(container) {
    try {
        const response = await fetch('templates/admin.html');
        const template = await response.text();
        container.innerHTML = template;
        
        // Initialize the admin page
        await initializeAdminPage();
    } catch (error) {
        console.error('Error loading admin page:', error);
        container.innerHTML = 'Error loading admin page';
    }
}

async function initializeAdminPage() {
    // Load initial data
    await loadPendingRequests();
    await loadUsers();
    
    // Set up modal functions
    window.showAddUserModal = function() {
        document.getElementById('addUserModal').classList.remove('hidden');
    };
    
    window.hideAddUserModal = function() {
        document.getElementById('addUserModal').classList.add('hidden');
    };
    
    window.handleAddUser = async function() {
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        
        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password, role })
            });

            if (!response.ok) throw new Error('Failed to create user');

            alert('User created successfully!');
            hideAddUserModal();
            await loadUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Error creating user: ' + error.message);
        }
    };
}

async function loadPendingRequests() {
    const tableBody = document.getElementById('requestsTableBody');
    try {
        const response = await fetch('http://localhost:5000/api/requests', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch requests');
        
        const result = await response.json();
        const requests = result.data;
        
        tableBody.innerHTML = requests.map(request => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${request.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${request.username}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${request.item_type} (${request.lot_number})
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${request.request_type}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${request.request_data}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(request.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="handleRequest(${request.id}, 'approved')"
                        class="text-green-600 hover:text-green-900 mr-3">
                        Approve
                    </button>
                    <button onclick="handleRequest(${request.id}, 'rejected')"
                        class="text-red-600 hover:text-red-900">
                        Reject
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading requests:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-red-500">
                    Error loading requests: ${error.message}
                </td>
            </tr>
        `;
    }
}

async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    try {
        const response = await fetch('http://localhost:5000/api/users', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const result = await response.json();
        const users = result.data;
        
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.username}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.role}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(user.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${user.role !== 'admin' ? `
                        <button onclick="deleteUser(${user.id})"
                            class="text-red-600 hover:text-red-900">
                            Delete
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    Error loading users: ${error.message}
                </td>
            </tr>
        `;
    }
}

window.deleteUser = async function(userId, username) {
    if (confirm(`Are you sure you want to delete the user "${username}"?`)) {
        try {
            const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to delete user');

            alert('User deleted successfully!');
            await loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user: ' + error.message);
        }
    }
};

// Add request handling function to window object for button click handlers
window.handleRequest = async function(requestId, status) {
    try {
        const response = await fetch(`http://localhost:5000/api/requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update request');

        alert(`Request ${status} successfully!`);
        await loadPendingRequests();
    } catch (error) {
        console.error('Error handling request:', error);
        alert('Error handling request: ' + error.message);
    }
};