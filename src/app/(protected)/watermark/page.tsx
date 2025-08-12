"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import ProgressBar from "@/src/components/ui/progress";
import { Badge } from "@/src/components/ui/badge";
import {
  X,
  Upload,
  Download,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

const WatermarkPage = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [watermarkText, setWatermarkText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (images.length + files.length > 20) {
      toast.error("Maximum 20 images allowed");
      return;
    }

    const newImages: ImageFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const applyWatermarkToImage = async (image: ImageFile): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
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
        }

        const processedUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(processedUrl);
      };

      img.src = image.preview;
    });
  };

  const downloadImages = async () => {
    if (!watermarkText.trim()) {
      toast.error("Please enter watermark text");
      return;
    }

    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const zip = new JSZip();

      // Process all images with watermarks
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const processedUrl = await applyWatermarkToImage(image);

        // Fetch the processed image and add to zip
        const response = await fetch(processedUrl);
        const blob = await response.blob();

        // Get file extension from original file
        const extension = image.file.name.split(".").pop() || "jpg";
        const fileName = `watermarked_${i + 1}.${extension}`;

        zip.file(fileName, blob);

        // Update progress
        setProgress(((i + 1) / images.length) * 100);
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "watermarked_images.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

              URL.revokeObjectURL(url);
        toast.success("Images processed and downloaded successfully!");
        
        // Clear all images after successful download
        clearAll();
      } catch (error) {
        console.error("Error processing and downloading images:", error);
        toast.error("Error processing and downloading images");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
  };

  const clearAll = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setWatermarkText("");
    setProgress(0);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="relative z-10 container mx-auto p-6 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Image Watermark Tool
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Upload up to 20 images, add your watermark text, and download all
            processed images in a single ZIP file.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Images
              </CardTitle>
              <CardDescription className="text-white/70">
                Select up to 20 images to watermark
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="text-white"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-white/20 text-white bg-transparent hover:bg-white/10"
                >
                  Browse
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {images.length}/20 images
                </Badge>
                {images.length > 0 && (
                  <Button
                    onClick={clearAll}
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.preview}
                        alt="Preview"
                        className="w-full h-20 object-cover rounded border border-white/20"
                      />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watermark Settings */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Watermark Settings
              </CardTitle>
              <CardDescription className="text-white/70">
                Configure your watermark text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Watermark Text
                </label>
                <Input
                  type="text"
                  placeholder="Enter watermark text..."
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="text-white placeholder:text-white/50"
                />
              </div>

              <div className="space-y-2">
                {isProcessing && (
                  <div className="space-y-2">
                    <ProgressBar progress={progress} className="w-full" />
                    <p className="text-sm text-white/70 text-center">
                      Processing {Math.round(progress)}%
                    </p>
                  </div>
                )}

                <Button
                  onClick={downloadImages}
                  disabled={
                    isProcessing || images.length === 0 || !watermarkText.trim()
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isProcessing
                    ? "Processing..."
                    : "Download Watermarked Images"}
                </Button>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Total Images:</span>
                  <span className="text-white">{images.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Ready to Process:</span>
                  <span className="text-white">
                    {images.length > 0 && watermarkText.trim() ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8 bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-white/80">
              <li>
                Upload up to 20 images using the file input or browse button
              </li>
              <li>Enter the watermark text you want to add to the images</li>
              <li>
                Click "Download Watermarked Images" to process and download all
                images
              </li>
              <li>
                The watermark will be placed at the top-left corner of each
                image with a professional background
              </li>
              <li>
                All processed images will be automatically downloaded as a ZIP
                file
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WatermarkPage;
