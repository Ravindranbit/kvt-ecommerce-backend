const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admins = await prisma.admin.findMany();
    console.log("All admins:", admins);
    
    const admin = await prisma.admin.findUnique({
      where: { email: "admin@kvt.com" }
    });
    
    if (admin) {
      console.log("\nAdmin found:");
      console.log("Email:", admin.email);
      console.log("Name:", admin.name);
      console.log("IsActive:", admin.isActive);
      console.log("IsTemporaryPassword:", admin.isTemporaryPassword);
      console.log("PasswordHash:", admin.passwordHash.substring(0, 20) + "...");
    } else {
      console.log("Admin not found!");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
