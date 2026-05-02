const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  
  // Create a token manually or just test the prisma query
  // Actually, I'll just check if the deleteMany works
  const cartItem = await prisma.cartItem.findFirst();
  console.log("Before delete:", !!cartItem);
  
  if (cartItem) {
    const res = await prisma.cartItem.deleteMany({
      where: {
        cartId: cartItem.cartId,
        productId: cartItem.productId
      }
    });
    console.log("Deleted count:", res.count);
  }
}
test().finally(() => prisma.$disconnect());
