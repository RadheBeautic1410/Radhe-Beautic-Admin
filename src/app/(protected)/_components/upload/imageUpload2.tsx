"use client";

import { UploadCloud, FileImage, FolderArchive, X } from "lucide-react";
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
import { toast } from "sonner";
import {
  getStorage,
  ref as ImgRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/src/lib/firebase/firebase";
import imageCompression from "browser-image-compression";
import { v4 as uuidv4 } from "uuid";

interface ChildProps {
  onImageChange: (data: any[]) => void;
  images: any[];
}

export interface ImageUploadRef {
  reset: () => void;
}
async function getImageDimensions(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(`${img.width} x ${img.height}`);
    img.src = URL.createObjectURL(file);
  });
}

const ImageUpload2 = forwardRef<ImageUploadRef, ChildProps>(
  ({ onImageChange, images }, ref) => {
    const [uploadQueue, setUploadQueue] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [compressionInProgress, setCompressionInProgress] = useState(false);
    const [deletingImage, setDeletingImage] = useState<string | null>(null);

    const reset = () => {
      onImageChange([]);
      setUploadQueue([]);
    };

    useImperativeHandle(ref, () => ({
      reset,
    }));

    const getFileIconAndColor = (file: File) => {
      if (file.type.includes("image")) {
        return {
          icon: <FileImage size={40} className="fill-purple-600" />,
          color: "bg-purple-600",
        };
      }
      return {
        icon: <FolderArchive size={40} className="fill-gray-400" />,
        color: "bg-gray-400",
      };
    };

    const compressImage = async (file: File) => {
      try {
        setCompressionInProgress(true);
        if (file.size / 1024 / 1024 <= 2) return file;
        const compressed = await imageCompression(file, {
          maxSizeMB: 2.5, // Try to keep final size under 2.5 MB
          useWebWorker: true,
          maxWidthOrHeight: 1920,
          initialQuality: 0.92,
        });

        // Only use compressed version if it's smaller
        if (compressed.size < file.size) {
          return compressed;
        } else {
          return file;
        }
      } catch (error) {
        toast.error("Image compression failed.");
        return file;
      } finally {
        setCompressionInProgress(false);
      }
    };

    const uploadImage = (file: File, path: string): Promise<string> => {
      const storageRef = ImgRef(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
    };

    const onDrop = useCallback(
      async (acceptedFiles: File[]) => {
        setIsUploading(true);

        const allImgs: any[] = [];

        const uploadBatch = acceptedFiles.map(async (file) => {
          const compressed = await compressImage(file);
          const path = `images/${uuidv4()}-${file.name}`;
          const url = await uploadImage(compressed, path);

          allImgs.push({ url, path });
        });

        try {
          await Promise.all(uploadBatch);
          const updated = [...images, ...allImgs];
          onImageChange(updated);
        } catch (err) {
          toast.error("Upload failed.");
        } finally {
          setIsUploading(false);
        }
      },
      [images, onImageChange]
    );

    const removeImage = async (img: any) => {
      setDeletingImage(img.path);

      try {
        const fileRef = ImgRef(storage, img.path);
        await deleteObject(fileRef);

        const updated = images.filter((i) => i.path !== img.path);
        onImageChange(updated);
        toast.success("Image deleted.");
      } catch (err) {
        toast.error("Failed to delete image.");
      } finally {
        setDeletingImage(null);
      }
    };

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      multiple: true,
      accept: {
        "image/*": [],
      },
    });

    return (
      <div className="space-y-4">
        {/* Upload Box */}
        <label
          {...getRootProps()}
          className="relative flex flex-col items-center justify-center w-full py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="text-center">
            <div className="border p-2 rounded-md max-w-min mx-auto">
              <UploadCloud size={20} />
            </div>
            <p className="mt-2 text-sm text-gray-600 font-semibold">
              Drag files
            </p>
            <p className="text-xs text-gray-500">
              Click to upload files (under 25MB)
            </p>
          </div>
        </label>
        <Input
          {...getInputProps()}
          id="dropzone-file"
          type="file"
          className="hidden"
        />

        {compressionInProgress && (
          <p className="text-sm text-muted-foreground">Compressing images…</p>
        )}
        {isUploading && (
          <p className="text-sm text-muted-foreground">Uploading images…</p>
        )}

        {/* Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative group rounded overflow-hidden">
                <img
                  src={img.url}
                  alt={`upload-${i}`}
                  className="w-full h-40 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  disabled={deletingImage === img.path}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50"
                >
                  {deletingImage === img.path ? (
                    "..."
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ImageUpload2.displayName = "ImageUpload2";
export default ImageUpload2;
