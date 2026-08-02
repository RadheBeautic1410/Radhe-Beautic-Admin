const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching latest 5 Kurtis...");
  const latest = await prisma.kurti.findMany({
    orderBy: {
      lastUpdatedTime: 'desc'
    },
    take: 5,
    select: {
      code: true,
      name: true,
      imageVector: true,
      lastUpdatedTime: true
    }
  });

  for (const k of latest) {
    console.log(`- Code: ${k.code}, Name: ${k.name}`);
    console.log(`  Updated: ${k.lastUpdatedTime}`);
    console.log(`  Vector Length: ${k.imageVector ? k.imageVector.length : 'undefined'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
