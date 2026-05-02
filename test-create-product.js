const axios = require('axios');

async function test() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3001/admin/login', {
      email: 'admin@kvt.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.token;
    console.log('Login successful, token acquired');

    // 2. Get a category ID to use
    const catsRes = await axios.get('http://localhost:3001/categories');
    const categoryId = catsRes.data.data[0].id;
    console.log('Using category:', categoryId);

    // 3. Create product
    const productRes = await axios.post('http://localhost:3001/products', {
      name: 'Test Product Fix',
      description: 'Testing the 500 error fix',
      price: 199,
      stock: 10,
      categoryId: categoryId
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Product created successfully:', productRes.data.data.id);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
