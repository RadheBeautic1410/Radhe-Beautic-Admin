import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // fetch all categories
  const categories = await prisma.category.findMany();

  for (const category of categories) {
    // find one Kurti in this category
    const kurti = await prisma.kurti.findFirst({
      where: {
        category: category.name, // or category.name depending on your real structure, adjust accordingly
        isDeleted: false, // only consider non-deleted
      },
    });

    if (kurti) {
      // Convert sellingPrice and actualPrice from string to float
      const sellingPrice = parseFloat(kurti.sellingPrice);
      const actualPrice = parseFloat(kurti.actualPrice);

      // Update Category prices
      await prisma.category.update({
        where: { id: category.id },
        data: {
          sellingPrice: isNaN(sellingPrice) ? null : sellingPrice,
          actualPrice: isNaN(actualPrice) ? null : actualPrice,
        },
      });

      console.log(
        `Updated Category ${category.name} prices from Kurti ${kurti.code}`
      );
    } else {
      console.log(`No Kurti found for Category ${category.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
