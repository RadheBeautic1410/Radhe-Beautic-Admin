// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fetch all categories
  const categories = await prisma.category.findMany({
    where: {
      isDeleted: false,
    },
  });

  for (const category of categories) {
    const upperName = category.name.toUpperCase();

    // Only update if needed
    if (category.name !== upperName) {
      await prisma.category.update({
        where: { id: category.id },
        data: { name: upperName },
      });
      console.log(`Updated ${category.name} -> ${upperName}`);
    }
  }
}

main()
  .then(() => {
    console.log('✅ Seeding complete');
  })
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
