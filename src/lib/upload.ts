import { storage } from "@/src/lib/firebase/firebase";
import { ref as ImgRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import imageCompression from "browser-image-compression";

// Compress before upload
export const compressImage = async (file: File) => {
  if (file.size / 1024 / 1024 <= 2) return file;
  const compressed = await imageCompression(file, {
    maxSizeMB: 2.5,
    maxWidthOrHeight: 1920,
    initialQuality: 0.9,
    useWebWorker: true,
  });
  return compressed.size < file.size ? compressed : file;
};

// Upload file and return URL + path
export const uploadImage = (file: File): Promise<{ url: string; path: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const compressed = await compressImage(file);
      const path = `New_Relese/${uuidv4()}-${file.name}`;
      const storageRef = ImgRef(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, compressed);

      uploadTask.on(
        "state_changed",
        null,
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path });
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};

// Delete image from Firebase
export const removeImage = async (path: string) => {
  const fileRef = ImgRef(storage, path);
  await deleteObject(fileRef);
};
