/**
 * Applies a text watermark to an image file
 * @param file - The image file to watermark
 * @param watermarkText - The text to use as watermark
 * @returns A Promise that resolves to a File with the watermark applied
 */
export const applyTextWatermarkToFile = async (
  file: File,
  watermarkText: string
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Create object URL from file
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Clean up object URL
        URL.revokeObjectURL(objectUrl);

        canvas.width = img.width;
        canvas.height = img.height;

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Calculate font size based on image dimensions
        const fontSize = Math.max(
          16,
          Math.min(48, Math.min(img.width, img.height) * 0.04)
        );
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        // Create a semi-transparent background for better readability
        const text = watermarkText;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        const padding = 12;
        const bgX = 20;
        const bgY = 20;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;

        // Draw background rectangle with gradient effect
        const gradient = ctx.createLinearGradient(
          bgX,
          bgY,
          bgX + bgWidth,
          bgY + bgHeight
        );
        gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");

        ctx.fillStyle = gradient;
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

        // Add subtle border to background
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);

        // Draw watermark text with better styling
        const textX = bgX + padding;
        const textY = bgY + padding + textHeight * 0.8;

        // Text shadow for better visibility
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Main text
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillText(text, textX, textY);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Convert canvas to blob, then to File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const watermarkedFile = new File(
                [blob],
                file.name,
                { type: file.type || "image/jpeg" }
              );
              resolve(watermarkedFile);
            } else {
              reject(new Error("Failed to create watermarked image"));
            }
          },
          "image/jpeg",
          0.9
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
};

