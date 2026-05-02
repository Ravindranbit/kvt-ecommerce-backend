const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) { console.log('No user'); return; }
  
  const product = await prisma.product.findFirst();
  if (!product) { console.log('No product'); return; }

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: product.id,
      price: product.price,
      quantity: 1
    }
  });
  console.log('Cart item created with productId:', product.id);
}
test().finally(() => prisma.$disconnect());
