const axios = require('axios');

async function test() {
  try {
    // 1. Register a test user
    const username = 'testuser_' + Date.now();
    const email = username + '@test.com';
    const registerRes = await axios.post('http://localhost:3001/api/auth/register', {
      username,
      email,
      password: 'password123'
    });
    const token = registerRes.data.data.token;
    console.log('Registered successfully. Token:', token.substring(0, 20) + '...');

    // 2. Update profile
    const putRes = await axios.put('http://localhost:3001/api/users/profile', {
      username: username + '_updated',
      avatar: 'https://example.com/avatar.png'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Update profile successfully:', putRes.data.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
