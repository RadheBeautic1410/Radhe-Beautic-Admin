import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient();

async function updateKurtiImages() {
  try {
    console.log("Starting Kurti images update...");

    // Get all Kurti records
    const kurtis = await prisma.kurti.findMany({
      select: {
        id: true,
        images: true,
        code: true,
      },
    });

    console.log(`Found ${kurtis.length} Kurti records to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const kurti of kurtis) {
      try {
        // Check if images array exists and has items
        if (
          !kurti.images ||
          !Array.isArray(kurti.images) ||
          kurti.images.length === 0
        ) {
          console.log(`Skipping Kurti ${kurti.code} - no images found`);
          skippedCount++;
          continue;
        }

        // Transform images array to add is_hidden and id
        const updatedImages = kurti.images.map((image) => {
          // If image already has id and is_hidden, skip transformation
          if (image.id && image.hasOwnProperty("is_hidden")) {
            return image;
          }

          // Add new properties
          return {
            ...image,
            id: uuidv4(),
            is_hidden: false,
          };
        });

        // Update the Kurti record
        await prisma.kurti.update({
          where: { id: kurti.id },
          data: {
            images: updatedImages,
          },
        });

        updatedCount++;
        console.log(
          `Updated Kurti ${kurti.code} - processed ${updatedImages.length} images`
        );
      } catch (error) {
        console.error(`Error updating Kurti ${kurti.code}:`, error.message);
      }
    }

    console.log("\n=== Update Summary ===");
    console.log(`Total Kurti records found: ${kurtis.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no images): ${skippedCount}`);
    console.log(`Failed: ${kurtis.length - updatedCount - skippedCount}`);
  } catch (error) {
    console.error("Error in updateKurtiImages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seeder
updateKurtiImages()
  .then(() => {
    console.log("\nKurti images update completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeder failed:", error);
    process.exit(1);
  });
