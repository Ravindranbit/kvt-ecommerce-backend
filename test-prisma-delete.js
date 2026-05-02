const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const cartItem = await prisma.cartItem.findFirst();
  if (!cartItem) {
    console.log("No cart items found");
    return;
  }
  console.log("Found cart item:", cartItem);
  
  const res = await prisma.cartItem.deleteMany({
    where: {
      cartId: cartItem.cartId,
      productId: cartItem.productId
    }
  });
  console.log("Deleted count:", res.count);
}
test().finally(() => prisma.$disconnect());
