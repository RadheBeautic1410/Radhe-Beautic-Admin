import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function updateLowercaseCategories() {
  // 1️⃣ Get all non-deleted kurtis
  const kurtis = await prisma.kurti.findMany({
    where: { isDeleted: false },
    select: { id: true, category: true }
  });

  // 2️⃣ Filter lowercase ones
  const lowercaseKurtis = kurtis.filter(k => k.category === k.category.toLowerCase());

  console.log(`Found ${lowercaseKurtis.length} lowercase categories`);

  // 3️⃣ Update
  for (const kurti of lowercaseKurtis) {
    await prisma.kurti.update({
      where: { id: kurti.id },
      data: { category: kurti.category.toUpperCase() }
    });
  }

  console.log("✅ Updated lowercase categories to uppercase");
}

updateLowercaseCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
