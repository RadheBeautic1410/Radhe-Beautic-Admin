import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Fetch all categories
  const categories = await prisma.category.findMany();

  for (const category of categories) {
    // For each category, find all KURTIs with that category
    const kurtis = await prisma.kurti.findMany({
      where: {
        category: category.name,
        isDeleted: false,
      },
    });

    // totalItems is total number of kurtis for this category
    const totalItems = kurtis.length;

    // Sum quantities from sizes arrays of all kurtis, ignoring -1 quantities
    let countTotal = 0;

    for (const kurti of kurtis) {
      // sizes field is Json[], as per your schema, parse and sum
      const sizes = kurti.sizes;
      if (sizes && Array.isArray(sizes)) {
        for (const sizeObject of sizes) {
          if (sizeObject.quantity !== -1 && typeof sizeObject.quantity == "number") {
            countTotal += sizeObject.quantity;
          }
        }
      }
    }

    console.log(
      `Updated category ${category.name} with totalItems=${totalItems} and countTotal=${countTotal}`
    );
    // Update the category with aggregated totals
    await prisma.category.update({
      where: { id: category.id },
      data: {
        totalItems,
        countTotal: countTotal ?? 0,
      },
    });

    console.log(
      `Updated category ${category.name} with totalItems=${totalItems} and countTotal=${countTotal}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
