import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting customerPrice seeder...");

  // Get total count of all categories for reference
  const totalCategories = await prisma.category.count();
  
  // Fetch all categories where customerPrice is null (categories with existing customerPrice are automatically skipped)
  const categories = await prisma.category.findMany({
    where: {
      customerPrice: null,
    },
  });

  console.log(`Found ${categories.length} categories without customerPrice (out of ${totalCategories} total categories)`);
  console.log(`Categories with existing customerPrice will be skipped automatically.\n`);

  let updatedCount = 0;

  for (const category of categories) {
    // Only update if sellingPrice exists and is valid
    if (category.sellingPrice !== null && category.sellingPrice !== undefined && category.sellingPrice > 0) {
      await prisma.category.update({
        where: { id: category.id },
        data: {
          customerPrice: category.sellingPrice,
        },
      });

      updatedCount++;
      console.log(
        `Updated Category "${category.name}" - customerPrice set to ${category.sellingPrice} (same as sellingPrice)`
      );
    } else {
      console.log(
        `Skipped Category "${category.name}" - sellingPrice is ${category.sellingPrice}`
      );
    }
  }

  console.log(`\nSeeder completed! Updated ${updatedCount} out of ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error("Error running seeder:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

