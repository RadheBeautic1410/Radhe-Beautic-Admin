import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting kurti customerPrice seeder...");
  console.log("This will update all kurtis' customerPrice based on their category's customerPrice.\n");

  // Fetch all categories that have customerPrice set (not null)
  const categories = await prisma.category.findMany({
    where: {
      customerPrice: {
        not: null,
      },
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      customerPrice: true,
    },
  });

  console.log(`Found ${categories.length} categories with customerPrice set`);

  let totalKurtisUpdated = 0;
  let totalCategoriesProcessed = 0;

  for (const category of categories) {
    // Update all non-deleted kurtis in this category to match category's customerPrice
    const updateResult = await prisma.kurti.updateMany({
      where: {
        category: category.name,
        isDeleted: false,
      },
      data: {
        customerPrice: category.customerPrice,
      },
    });

    if (updateResult.count > 0) {
      totalKurtisUpdated += updateResult.count;
      totalCategoriesProcessed++;
      console.log(
        `  Category "${category.name}": Updated ${updateResult.count} kurtis with customerPrice = ${category.customerPrice}`
      );
    } else {
      console.log(`  Category "${category.name}": No kurtis found (skipped)`);
    }
  }

  console.log(`\nSeeder completed!`);
  console.log(`  Categories processed: ${totalCategoriesProcessed}`);
  console.log(`  Total kurtis updated: ${totalKurtisUpdated}`);
}

main()
  .catch((e) => {
    console.error("Error running seeder:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

