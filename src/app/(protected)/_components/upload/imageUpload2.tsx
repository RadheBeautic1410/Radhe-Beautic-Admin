"use client";
import axios, { AxiosProgressEvent, CancelTokenSource } from "axios";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { useDropzone } from "react-dropzone";
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
import React, {
  Dispatch,
  SetStateAction,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { ScrollArea } from "@/src/components/ui/scroll-area";
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

interface ChildProps {
  onImageChange: (data: any) => void;
  images: any[];
  singleFile?: boolean; // New prop to control single/multiple file mode
}

interface FileUploadProgress {
  progress: number;
  File: File;
  source: CancelTokenSource | null;
  storagePath: string; // Added storagePath to track the file location in Firebase Storage
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
    { onImageChange, images, singleFile = false }: ChildProps,
    ref: React.Ref<ImageUploadRef>
  ) => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imgs, setImgs] = useState<any[]>([]);
    const [progress, setProgress] = useState<number>(0);
    const [filesToUpload, setFilesToUpload] = useState<FileUploadProgress[]>(
      []
    );
    const [deletingImage, setDeletingImage] = useState<string | null>(null);
    const [compressionInProgress, setCompressionInProgress] = useState(false); // Track compression state
    const [isUploading, setIsUploading] = useState(false);

    const reset = () => {
      setUploadedFiles([]);
      setImgs([]);
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
      return {
        icon: <FolderArchive size={40} className={OtherColor.fillColor} />,
        color: OtherColor.bgColor,
      };
    };

    const compressImage = async (file: File) => {
      try {
        setCompressionInProgress(true); // Start loading indicator
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        return compressedFile;
      } catch (error) {
        console.error("Error compressing file: ", error);
        toast.error("Failed to compress image.");
        return file; // Return original file if compression fails
      } finally {
        setCompressionInProgress(false); // Stop loading indicator
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

      let temp = [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        if (uploadedFiles[i] !== file) {
          temp.push(images[i]);
        }
      }
      onImageChange(temp);
      setImgs(temp);

      const fileToDelete = filesToUpload.find((item) => item.File === file);
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

    const uploadImage = async (file: File, path: string) => {
      const storageRef = ImgRef(storage, path);
      const metadata = {
        cacheControl: "public, max-age=5184000", // Cache for 1 year
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
        // Handle single file mode - only take the first file and clear existing ones
        const filesToProcess = singleFile ? [acceptedFiles[0]] : acceptedFiles;

        if (singleFile && filesToProcess.length > 0) {
          // Clear existing files in single file mode
          setFilesToUpload([]);
          setUploadedFiles([]);
          setImgs([]);
        }

        // Show warning for single file mode if multiple files were dropped
        if (singleFile && acceptedFiles.length > 1) {
          toast.warning(
            "Only one file is allowed. The first file will be uploaded."
          );
        }

        setFilesToUpload((prevUploadProgress) => [
          ...(singleFile ? [] : prevUploadProgress), // Clear previous files in single mode
          ...filesToProcess.map((file) => ({
            progress: 0,
            File: file,
            source: null,
            storagePath: "",
          })),
        ]);
        setIsUploading(true);

        try {
          setCompressionInProgress(true);
          const fileUploadBatch = filesToProcess.map(async (file) => {
            const compressedFile = await compressImage(file);
            const storagePath = `images/${uuidv4()}`;
            const downloadURL = await uploadImage(compressedFile, storagePath);

            // Update filesToUpload with storagePath
            setFilesToUpload((prevUploadProgress) =>
              prevUploadProgress.map((item) =>
                item.File.name === file.name ? { ...item, storagePath } : item
              )
            );

            // Handle image state updates based on single/multiple mode
            setImgs((prevImgs) => {
              const newImage = { url: downloadURL };
              const updatedImgs = singleFile
                ? [newImage]
                : [...prevImgs, newImage];
              // Pass the updated images list to the parent component
              onImageChange(updatedImgs);
              return updatedImgs;
            });

            // Update the uploadedFiles state
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
      [onImageChange, singleFile]
    );

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      multiple: !singleFile, // Disable multiple selection in single file mode
      maxFiles: singleFile ? 1 : undefined, // Limit to 1 file in single mode
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
                  ? "Click to upload a file; file should be under 25 MB;"
                  : "Click to upload files;files should be under 25 MB;"}
              </p>
            </div>
          </label>
          <Input
            {...getInputProps()}
            id="dropzone-file"
            accept="image/png, image/jpeg"
            type="file"
            className="hidden"
            multiple={!singleFile}
          />
        </div>
        {compressionInProgress && (
          <p className="text-sm text-blue-600 mt-2">
            Compressing {singleFile ? "image" : "images"}...
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

export default ImageUpload2;
