import React, { useState } from 'react';

const AdminUsers = () => {
  const [users, setUsers] = useState([
    { id: 1, name: 'User1', status: 'active' },
    { id: 2, name: 'User2', status: 'active' },
    { id: 3, name: 'User3', status: 'blocked' },
  ]);

  const handleBlock = (id) => {
    setUsers(users.map(user => user.id === id ? { ...user, status: user.status === 'active' ? 'blocked' : 'active' } : user));
    console.log(`User ${id} status toggled`);
  };

  const handleDelete = (id) => {
    setUsers(users.filter(user => user.id !== id));
    console.log(`User ${id} deleted`);
  };

  return (
    <div>
      <h1>Admin User Management</h1>
      <h2>User List</h2>
      {users.length === 0 ? (
        <p>No users to display.</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.name} (Status: {user.status})
              <button onClick={() => handleBlock(user.id)} style={{ marginLeft: '10px', backgroundColor: user.status === 'active' ? 'orange' : 'green', color: 'white' }}>
                {user.status === 'active' ? 'Block' : 'Unblock'}
              </button>
              <button onClick={() => handleDelete(user.id)} style={{ marginLeft: '10px', backgroundColor: 'red', color: 'white' }}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminUsers;