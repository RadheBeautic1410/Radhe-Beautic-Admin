"use client";

import {
  Dispatch,
  SetStateAction,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Input } from "@/src/components/ui/input";
import {
  AudioWaveform,
  File,
  FileImage,
  FolderArchive,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import ProgressBar from "@/src/components/ui/progress";
import {
  getStorage,
  ref as ImgRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/src/lib/firebase/firebase";
import "firebase/compat/firestore";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import imageCompression from "browser-image-compression";
import { AxiosProgressEvent, CancelTokenSource } from "axios";
import React from "react";
import { applyTextWatermarkToFile } from "@/src/lib/watermark";

interface ChildProps {
  onImageChange: (data: any) => void;
  onVideoChange?: (data: any) => void; // New prop for video changes
  images: any[];
  videos?: any[]; // New prop for videos
  singleFile?: boolean;
  allowVideos?: boolean; // New flag to enable video uploads
  watermarkText?: string; // Optional watermark text to apply to images
}

interface FileUploadProgress {
  progress: number;
  File: File;
  source: CancelTokenSource | null;
  storagePath: string;
  fileType: "image" | "video"; // Track file type
}

enum FileTypes {
  Image = "image",
  Pdf = "pdf",
  Audio = "audio",
  Video = "video",
  Other = "other",
}

const ImageColor = {
  bgColor: "bg-purple-600",
  fillColor: "fill-purple-600",
};

const PdfColor = {
  bgColor: "bg-blue-400",
  fillColor: "fill-blue-400",
};

const AudioColor = {
  bgColor: "bg-yellow-400",
  fillColor: "fill-yellow-400",
};

const VideoColor = {
  bgColor: "bg-green-400",
  fillColor: "fill-green-400",
};

const OtherColor = {
  bgColor: "bg-gray-400",
  fillColor: "fill-gray-400",
};

export interface ImageUploadRef {
  reset: () => void;
}

const ImageUpload2 = React.forwardRef(
  (
    {
      onImageChange,
      onVideoChange,
      images,
      videos = [],
      singleFile = false,
      allowVideos = false,
      watermarkText,
    }: ChildProps,
    ref: React.Ref<ImageUploadRef>
  ) => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imgs, setImgs] = useState<any[]>([]);
    const [vids, setVids] = useState<any[]>(videos); // New state for videos
    const [progress, setProgress] = useState<number>(0);
    const [filesToUpload, setFilesToUpload] = useState<FileUploadProgress[]>(
      []
    );
    const [deletingImage, setDeletingImage] = useState<string | null>(null);
    const [compressionInProgress, setCompressionInProgress] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const reset = () => {
      setUploadedFiles([]);
      setImgs([]);
      setVids([]);
      setFilesToUpload([]);
    };

    useImperativeHandle(ref, () => ({
      reset,
    }));

    const getFileIconAndColor = (file: File) => {
      if (file.type.includes(FileTypes.Image)) {
        return {
          icon: <FileImage size={40} className={ImageColor.fillColor} />,
          color: ImageColor.bgColor,
        };
      }
      if (file.type.includes(FileTypes.Video)) {
        return {
          icon: <Video size={40} className={VideoColor.fillColor} />,
          color: VideoColor.bgColor,
        };
      }
      return {
        icon: <FolderArchive size={40} className={OtherColor.fillColor} />,
        color: OtherColor.bgColor,
      };
    };

    const compressImage = async (file: File) => {
      try {
        setCompressionInProgress(true);
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 3,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        return compressedFile;
      } catch (error) {
        console.error("Error compressing file: ", error);
        toast.error("Failed to compress image.");
        return file;
      } finally {
        setCompressionInProgress(false);
      }
    };

    const onUploadProgress = (
      progressEvent: AxiosProgressEvent,
      file: File,
      cancelSource: CancelTokenSource
    ) => {
      const progress = Math.round(
        (progressEvent.loaded / (progressEvent.total ?? 0)) * 100
      );

      if (progress === 100) {
        setUploadedFiles((prevUploadedFiles) => {
          return [...prevUploadedFiles, file];
        });
        setFilesToUpload((prevUploadProgress) => {
          return prevUploadProgress.filter((item) => item.File !== file);
        });
        return;
      }

      setFilesToUpload((prevUploadProgress) => {
        return prevUploadProgress.map((item) => {
          if (item.File.name === file.name) {
            return {
              ...item,
              progress,
              source: cancelSource,
            };
          } else {
            return item;
          }
        });
      });
    };

    const removeFile = async (file: File) => {
      setDeletingImage(file.name);

      const fileToDelete = filesToUpload.find((item) => item.File === file);
      const isVideo = file.type.includes(FileTypes.Video);

      // Update the appropriate state based on file type
      if (isVideo) {
        let temp = [];
        for (let i = 0; i < uploadedFiles.length; i++) {
          if (uploadedFiles[i] !== file) {
            const videoIndex = uploadedFiles
              .slice(0, i)
              .filter((f) => f.type.includes(FileTypes.Video)).length;
            if (videoIndex < vids.length) {
              temp.push(vids[videoIndex]);
            }
          }
        }
        onVideoChange?.(temp);
        setVids(temp);
      } else {
        let temp = [];
        for (let i = 0; i < uploadedFiles.length; i++) {
          if (uploadedFiles[i] !== file) {
            const imageIndex = uploadedFiles
              .slice(0, i)
              .filter((f) => f.type.includes(FileTypes.Image)).length;
            if (imageIndex < imgs.length) {
              temp.push(imgs[imageIndex]);
            }
          }
        }
        onImageChange(temp);
        setImgs(temp);
      }

      if (fileToDelete) {
        const fileRef = ImgRef(storage, fileToDelete.storagePath);
        try {
          await deleteObject(fileRef);
          console.log(
            "File deleted from Firebase Storage:",
            fileToDelete.storagePath
          );
          toast.success("File deleted successfully.");
        } catch (error) {
          console.error("Error deleting file from Firebase Storage:", error);
          toast.error("Failed to delete file. Please try again.");
        }
      } else {
        toast.error("File not found.");
      }

      setFilesToUpload((prevUploadProgress) => {
        return prevUploadProgress.filter((item) => item.File !== file);
      });
      setUploadedFiles((prevUploadedFiles) => {
        return prevUploadedFiles.filter((item) => item !== file);
      });
      setDeletingImage(null);
    };

    const uploadFile = async (file: File, path: string) => {
      const storageRef = ImgRef(storage, path);
      const metadata = {
        cacheControl: "public, max-age=5184000",
      };
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setFilesToUpload((prevUploadProgress) => {
              return prevUploadProgress.map((item) => {
                if (item.File.name === file.name) {
                  return {
                    ...item,
                    progress,
                  };
                }
                return item;
              });
            });
          },
          (error) => {
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(downloadURL);
            resolve(downloadURL);
          }
        );
      });
    };

    const onDrop = useCallback(
      async (acceptedFiles: File[]) => {
        const filesToProcess = singleFile ? [acceptedFiles[0]] : acceptedFiles;

        if (singleFile && filesToProcess.length > 0) {
          setFilesToUpload([]);
          setUploadedFiles([]);
          setImgs([]);
          setVids([]);
        }

        if (singleFile && acceptedFiles.length > 1) {
          toast.warning(
            "Only one file is allowed. The first file will be uploaded."
          );
        }

        setFilesToUpload((prevUploadProgress) => [
          ...(singleFile ? [] : prevUploadProgress),
          ...filesToProcess.map((file) => ({
            progress: 0,
            File: file,
            source: null,
            storagePath: "",
            fileType: file.type.includes(FileTypes.Video)
              ? ("video" as const)
              : ("image" as const),
          })),
        ]);
        setIsUploading(true);

        try {
          setCompressionInProgress(true);
          const fileUploadBatch = filesToProcess.map(async (file) => {
            const isVideo = file.type.includes(FileTypes.Video);

            let processedFile = file;

            // Apply watermark to images if watermarkText is provided
            if (!isVideo && watermarkText && watermarkText.trim()) {
              try {
                processedFile = await applyTextWatermarkToFile(file, watermarkText);
              } catch (error) {
                console.error("Error applying watermark:", error);
                toast.error("Failed to apply watermark, uploading original image");
                // Continue with original file if watermark fails
              }
            }

            // Only compress images, not videos
            processedFile = isVideo ? processedFile : await compressImage(processedFile);

            const storagePath = `${isVideo ? "videos" : "images"}/${uuidv4()}`;
            const downloadURL = await uploadFile(processedFile, storagePath);

            setFilesToUpload((prevUploadProgress) =>
              prevUploadProgress.map((item) =>
                item.File.name === file.name ? { ...item, storagePath } : item
              )
            );

            const newFileData = { url: downloadURL };

            if (isVideo) {
              // Update videos state
              setVids((prevVids) => {
                const updatedVids = singleFile
                  ? [newFileData]
                  : [...prevVids, newFileData];
                onVideoChange?.(updatedVids);
                return updatedVids;
              });
            } else {
              // Update images state
              setImgs((prevImgs) => {
                const updatedImgs = singleFile
                  ? [newFileData]
                  : [...prevImgs, newFileData];
                onImageChange(updatedImgs);
                return updatedImgs;
              });
            }

            setUploadedFiles((prevUploadedFiles) =>
              singleFile ? [file] : [...prevUploadedFiles, file]
            );
          });

          await Promise.all(fileUploadBatch);
          console.log(
            `${singleFile ? "File" : "All files"} uploaded successfully`
          );
        } catch (error) {
          console.error("Error uploading files: ", error);
          toast.error("Failed to upload files. Please try again.");
        } finally {
          setCompressionInProgress(false);
          setIsUploading(false);
        }
      },
      [onImageChange, onVideoChange, singleFile, watermarkText]
    );

    // Define accepted file types based on allowVideos flag
    const acceptedFileTypes = allowVideos
      ? "image/png, image/jpeg, video/mp4, video/webm, video/ogg"
      : "image/png, image/jpeg";

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      multiple: !singleFile,
      maxFiles: singleFile ? 1 : undefined,
      accept: allowVideos
        ? {
            "image/*": [".png", ".jpg", ".jpeg"],
            "video/*": [".mp4", ".webm", ".ogg"],
          }
        : {
            "image/*": [".png", ".jpg", ".jpeg"],
          },
    });

    return (
      <>
        <div>
          <label
            {...getRootProps()}
            className="relative flex flex-col items-center justify-center w-full py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 "
          >
            <div className=" text-center">
              <div className=" border p-2 rounded-md max-w-min mx-auto">
                <UploadCloud size={20} />
              </div>

              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold">
                  {singleFile ? "Drag file" : "Drag files"}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {singleFile
                  ? `Click to upload a ${
                      allowVideos ? "file (image/video)" : "file"
                    }; file should be under 25 MB;`
                  : `Click to upload ${
                      allowVideos ? "files (images/videos)" : "files"
                    };files should be under 25 MB;`}
              </p>
            </div>
          </label>
          <Input
            {...getInputProps()}
            id="dropzone-file"
            accept={acceptedFileTypes}
            type="file"
            className="hidden"
            multiple={!singleFile}
          />
        </div>
        {compressionInProgress && (
          <p className="text-sm text-blue-600 mt-2">
            Processing {singleFile ? "file" : "files"}...
          </p>
        )}
        {filesToUpload.length > 0 && (
          <div>
            <ScrollArea className="h-40">
              <p className="font-medium my-2 mt-6 text-muted-foreground text-sm">
                {singleFile ? "File to upload" : "Files to upload"}
              </p>
              <div className="space-y-2 pr-3">
                {filesToUpload.map((fileUploadProgress, i) => {
                  return (
                    <div
                      key={`${
                        fileUploadProgress.File.lastModified
                      } - ${Math.floor(Math.random() * 10000)}`}
                      className="flex justify-between gap-2 rounded-lg overflow-hidden border border-slate-100 group hover:pr-0 pr-2"
                    >
                      <div className="flex items-center flex-1 p-2 space-x-2">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full ${
                            getFileIconAndColor(fileUploadProgress.File).color
                          }`}
                        >
                          {getFileIconAndColor(fileUploadProgress.File).icon}
                        </div>
                        <div className="flex-1 truncate">
                          <p className="text-sm font-medium truncate">
                            {fileUploadProgress.File.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {Math.round(fileUploadProgress.progress)} %
                            {fileUploadProgress.fileType === "video" &&
                              " (Video)"}
                          </p>
                        </div>
                      </div>
                      <button
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200"
                        onClick={() => removeFile(fileUploadProgress.File)}
                        disabled={
                          deletingImage === fileUploadProgress.File.name
                        }
                      >
                        {deletingImage === fileUploadProgress.File.name ? (
                          "Deleting..."
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </>
    );
  }
);

ImageUpload2.displayName = "ImageUpload2";

ImageUpload2.displayName = "ImageUpload2";
export default ImageUpload2;
