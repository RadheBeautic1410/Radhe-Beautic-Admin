// prisma/walletColumnUpdateSeeder.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      balance: 0,
    },
  });

  console.log(`${result.count} users updated with balance = 0`);
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
