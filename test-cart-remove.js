const axios = require('axios');
async function test() {
  try {
    const baseURL = 'http://[::1]:3001';
    // 1. login
    const login = await axios.post(`${baseURL}/auth/login`, {
      email: 'vendor1@example.com',
      password: 'password123'
    });
    const token = login.data.data.token;
    console.log('Logged in. Token length:', token.length);

    // 2. add item
    const products = await axios.get(`${baseURL}/products`);
    const pId = products.data.data.data[0].id;
    console.log('Adding product:', pId);

    const add = await axios.post(`${baseURL}/cart/add`, {
      productId: pId,
      quantity: 1
    }, { headers: { Authorization: 'Bearer ' + token } });
    console.log('Added to cart. Items:', add.data.data.items.length);

    // 3. remove item
    const remove = await axios.delete(`${baseURL}/cart/remove/${pId}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Removed from cart. Items:', remove.data.data.items.length);

    // 4. get cart
    const cart = await axios.get(`${baseURL}/cart`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Final cart items:', cart.data.data.items.length);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
