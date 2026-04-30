const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('http://localhost:3001/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@kvt.com',
        password: 'Admin@123'
      })
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testLogin();
