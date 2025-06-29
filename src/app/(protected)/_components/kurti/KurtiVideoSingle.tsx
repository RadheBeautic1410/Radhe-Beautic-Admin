"use client";

import { toggleKurtiVideoVisibility } from "@/src/actions/kurti";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import axios from "axios";
import { log } from "console";
import {
  Eye,
  EyeOff,
  Loader2,
  Download,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

interface KurtiVideoCardSingleProps {
  data: any;
  idx: number;
  onVideoDelete: (data: any) => void;
  onVideoToggle: (data: any) => void;
}

interface VideoDownloadProps {
  url: any;
  code: any;
  idx: number;
}

const VideoDownload: React.FC<VideoDownloadProps> = ({ url, code, idx }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        setDimensions({ width: video.videoWidth, height: video.videoHeight });
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.load(); // Force load

      return () =>
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [url]); // Add url as dependency

  return (
    <video
      ref={videoRef}
      id={`download${code}-${idx}-video`}
      className="w-full h-full object-cover"
      src={url}
      crossOrigin="anonymous"
      width={dimensions.width}
      height={dimensions.height}
      preload="auto"
      muted
    />
  );
};

const KurtiVideoCardSingle: React.FC<KurtiVideoCardSingleProps> = ({
  data,
  idx,
  onVideoDelete,
  onVideoToggle,
}) => {
  const [stockString, setStockString] = useState(``);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(
    null
  );
  const [isBrowserMobile, setIsBrowserMobile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const downloadVideoRef = useRef<HTMLVideoElement>(null);

  let selectSizes: string[] = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
    "4XL",
    "5XL",
    "6XL",
    "7XL",
    "8XL",
    "9XL",
    "10XL",
  ];

  console.log(idx, data.code);

  useEffect(() => {
    const handleResize = () => {
      setIsBrowserMobile(window.innerWidth < 992);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Video-specific functions
  const handleVideoPlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const createVideoThumbnail = (video: HTMLVideoElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to middle of video for thumbnail
      video.currentTime = video.duration / 2;

      video.addEventListener(
        "seeked",
        () => {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(thumbnailDataUrl);
        },
        { once: true }
      );
    });
  };

  // Fixed download function that forces download instead of opening in new tab
  const downloadVideo = async (videoUrl: string, filename: string) => {
    try {
      console.log("Attempting to download:", videoUrl);

      // Always use fetch method to create blob URL - this forces download
      const response = await fetch(videoUrl, {
        method: "GET",
        headers: {
          Accept: "video/mp4,video/*,*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the video as blob
      const blob = await response.blob();
      console.log("Blob created, size:", blob.size);

      // Create blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create download link with proper attributes
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = "none";

      // Force download attributes
      downloadLink.setAttribute("download", filename);
      downloadLink.setAttribute("type", "video/mp4");

      // Add to DOM, click, and remove
      document.body.appendChild(downloadLink);

      // Use setTimeout to ensure the element is in DOM
      setTimeout(() => {
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }, 100);

      toast.success("Video download started");
    } catch (error) {
      console.error("Download failed:", error);

      // Fallback: try direct download with proper headers
      try {
        const downloadLink = document.createElement("a");
        downloadLink.href = videoUrl;
        downloadLink.download = filename;
        downloadLink.style.display = "none";
        downloadLink.setAttribute("download", filename);

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast.success(
          "Download initiated (may open in new tab if CORS restricted)"
        );
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
        toast.error(
          "Failed to download video. Please try right-clicking the video and selecting 'Save video as...'"
        );
      }
    }
  };

  const downloadVideoWithWatermark = async (videoId: string) => {
    console.log("Downloading video with ID:", videoId);

    try {
      const videoUrl = data.videos[idx].url;
      const filename = `${data.code}-${idx}-video.mp4`;

      await downloadVideo(videoUrl, filename);

      // Note: Actual watermarking would require server-side processing
      console.log(
        "Video downloaded (watermarking requires server-side processing)"
      );
    } catch (error) {
      console.error("Error processing video:", error);
      toast.error("Failed to process video");
    }
  };

  const findBlocks = async () => {
    let sizesArray: any[] = data.sizes || [];
    sizesArray.sort(
      (a, b) => selectSizes.indexOf(a.size) - selectSizes.indexOf(b.size)
    );

    let stk = ``;
    for (let i = 0; i < sizesArray.length; i++) {
      stk += `${sizesArray[i].size.toUpperCase()} - ${
        sizesArray[i].quantity
      }\n`;
    }
    console.log("Stock string:", stk);
    setStockString(stk);
  };

  // Simplified and more reliable handleClick function
  const handleClick = async () => {
    if (downloading) return;

    setDownloading(true);

    try {
      await findBlocks();
      await downloadVideoWithWatermark(`${data.code}-${idx}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download video");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (data.videos.length === 1) {
        toast.error("You cannot delete last video.");
        return;
      }

      const res = await fetch(
        `/api/kurti/deleteVideo?code=${data?.code}&idx=${idx}`
      );
      const result = await res.json();
      console.log("Delete result:", result);
      await onVideoDelete(result.data);
    } catch (e: any) {
      console.log(e.message);
      toast.error("Something went wrong");
    }
  };

  const handleVideoVisibilityToggle = async (
    videoId: string,
    currentVisibility: boolean
  ) => {
    setUpdatingVisibility(videoId);
    try {
      const res = await toggleKurtiVideoVisibility(
        data.id,
        videoId,
        !currentVisibility
      );

      if (res.success) {
        await onVideoToggle(res.data);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to update video visibility");
    } finally {
      setUpdatingVisibility("");
    }
  };

  return (
    <div id="container" className="p-3 bg-slate-300">
      <div className="relative">
        <video
          ref={videoRef}
          className={`w-[300px] h-[300px] object-cover ${
            data.videos[idx].is_hidden ? "opacity-50" : ""
          }`}
          id={`${data.code}${idx}-visible`}
          src={data.videos[idx].url}
          crossOrigin="anonymous"
          muted
          loop
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play/Pause Overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black bg-opacity-20 hover:bg-opacity-30 transition-all"
          onClick={handleVideoPlayPause}
        >
          {!isPlaying && (
            <Play className="w-12 h-12 text-white opacity-80" fill="white" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {/* Hidden video for download - simplified approach */}
        <div className="w-0 h-0 overflow-hidden" aria-hidden="true">
          <video
            ref={downloadVideoRef}
            id={`download${data.code}-${idx}-video`}
            src={data.videos[idx].url}
            crossOrigin="anonymous"
            preload="metadata"
            muted
          />
        </div>

        <Button
          type="button"
          onClick={handleClick}
          variant={"outline"}
          key={"download"}
          disabled={downloading}
          title="Download video"
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          onClick={handleDelete}
          variant={"outline"}
          key={"delete"}
          disabled={downloading}
          title="Delete video"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant={data.videos[idx].is_hidden ? "destructive" : "default"}
          onClick={() =>
            handleVideoVisibilityToggle(
              data.videos[idx].id,
              data.videos[idx].is_hidden
            )
          }
          disabled={updatingVisibility === data.videos[idx].id}
          title={data.videos[idx].is_hidden ? "Show video" : "Hide video"}
        >
          {updatingVisibility === data.videos[idx].id ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : data.videos[idx].is_hidden ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleVideoPlayPause}
          title={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default KurtiVideoCardSingle;
