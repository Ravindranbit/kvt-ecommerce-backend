const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  const user = await prisma.user.findFirst();
  const product = await prisma.product.findFirst();
  
  if (!user || !product) {
    console.log("Missing user or product");
    return;
  }
  
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  console.log('Got token for user:', user.email);
  
  const baseURL = 'http://127.0.0.1:3001';
  
  // 1. Add
  let res = await fetch(`${baseURL}/cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ productId: product.id, quantity: 1 })
  });
  let data = await res.json();
  console.log("Add response items count:", data.data.items.length);
  
  // 2. Remove
  res = await fetch(`${baseURL}/cart/remove/${product.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  console.log("Remove response items count:", data.data.items.length);
  
  // 3. Verify DB
  const count = await prisma.cartItem.count({ where: { cartId: data.data.id }});
  console.log("DB count:", count);
}
test().finally(() => prisma.$disconnect());
