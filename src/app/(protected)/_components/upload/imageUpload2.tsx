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
import React, { Dispatch, SetStateAction, forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import ProgressBar from "@/src/components/ui/progress";
import { getStorage, ref as ImgRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'; // Updated import
import { storage } from "@/src/lib/firebase/firebase";
import 'firebase/compat/firestore';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

interface ChildProps {
    onImageChange: (data: any) => void;
    images: any[];
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

const ImageUpload2 = React.forwardRef(({ onImageChange, images }: ChildProps, ref: React.Ref<ImageUploadRef>) => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imgs, setImgs] = useState<any[]>([]);
    const [progress, setProgress] = useState<number>(0);
    const [filesToUpload, setFilesToUpload] = useState<FileUploadProgress[]>([]);
    const [deletingImage, setDeletingImage] = useState<string | null>(null); // Track the image being deleted

    const reset = () => {
        setUploadedFiles([]);
        setImgs([]);
        setFilesToUpload([]);
    };

    useImperativeHandle(ref, () => ({
        reset
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
        setDeletingImage(file.name); // Set the current deleting image
        let temp = [];
        console.log('uploaded', uploadedFiles);
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (uploadedFiles[i] !== file) {
                console.log(i);
                temp.push(images[i]);
            }
        }
        console.log(temp, temp.length);
        onImageChange(temp);
        setImgs(temp);

        const fileToDelete = filesToUpload.find((item) => item.File === file);
        if (fileToDelete) {
            const fileRef = ImgRef(storage, fileToDelete.storagePath);
            try {
                await deleteObject(fileRef); // Delete the file from Firebase Storage
                console.log("File deleted from Firebase Storage:", fileToDelete.storagePath);
            } catch (error) {
                console.error("Error deleting file from Firebase Storage:", error);
            }
        }

        setFilesToUpload((prevUploadProgress) => {
            return prevUploadProgress.filter((item) => item.File !== file);
        });
        setUploadedFiles((prevUploadProgress) => {
            return prevUploadProgress.filter((item) => item !== file);
        });
        setDeletingImage(null); // Clear the deleting state
    };

    const uploadImage = async (file: File, path: string) => {
        const storageRef = ImgRef(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise<string>((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
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

    const compressImage = async (file: File) => {
        try {
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 1, // Adjust the max size in MB
                maxWidthOrHeight: 1920, // Adjust the max width or height
                useWebWorker: true,
            });
            return compressedFile;
        } catch (error) {
            console.error("Error compressing file: ", error);
            toast.error("Failed to compress image.");
            return file; // Return the original file if compression fails
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setFilesToUpload((prevUploadProgress) => {
            return [
                ...prevUploadProgress,
                ...acceptedFiles.map((file) => {
                    return {
                        progress: 0,
                        File: file,
                        source: null,
                        storagePath: '', // Initialize storagePath to empty string
                    };
                }),
            ];
        });

        const fileUploadBatch = acceptedFiles.map(async (file) => {
            try {
                const compressedFile = await compressImage(file);
                const storagePath = `images/${uuidv4()}`;
                const downloadURL = await uploadImage(compressedFile, storagePath);

                setFilesToUpload((prevUploadProgress) => {
                    return prevUploadProgress.map((item) => {
                        if (item.File.name === file.name) {
                            return {
                                ...item,
                                storagePath, // Save the storage path for deletion later
                            };
                        }
                        return item;
                    });
                });

                let prevImages = [...imgs, { url: downloadURL }];
                setImgs(prevImages);
                onImageChange(prevImages);
            } catch (error) {
                console.error("Error uploading file: ", error);
                toast.error("Failed to upload image.");
            }
        });

        try {
            await Promise.all(fileUploadBatch);
            console.log("All files uploaded successfully");
        } catch (error) {
            console.error("Error uploading files: ", error);
        }
    }, [imgs]);

    const { getRootProps, getInputProps } = useDropzone({ onDrop });

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
                            <span className="font-semibold">Drag files</span>
                        </p>
                        <p className="text-xs text-gray-500">
                            Click to upload files &#40;files should be under 25 MB &#41;
                        </p>
                    </div>
                </label>
                <Input
                    {...getInputProps()}
                    id="dropzone-file"
                    accept="image/png, image/jpeg"
                    type="file"
                    className="hidden"
                />
            </div>
            {filesToUpload.length > 0 && (
                <div>
                    <ScrollArea className="h-40">
                        <p className="font-medium my-2 mt-6 text-muted-foreground text-sm">
                            Files to upload
                        </p>
                        <div className="space-y-2 pr-3">
                            {filesToUpload.map((fileUploadProgress, i) => {
                                return (
                                    <div
                                        key={`${fileUploadProgress.File.lastModified} - ${Math.floor(Math.random() * 10000)}`}
                                        className="flex justify-between gap-2 rounded-lg overflow-hidden border border-slate-100 group hover:pr-0 pr-2"
                                    >
                                        <div className="flex items-center flex-1 p-2 space-x-2">
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getFileIconAndColor(fileUploadProgress.File).color}`}>
                                                {getFileIconAndColor(fileUploadProgress.File).icon}
                                            </div>
                                            <div className="flex-1 truncate">
                                                <p className="text-sm font-medium truncate">{fileUploadProgress.File.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{Math.round(fileUploadProgress.progress)} %</p>
                                            </div>
                                        </div>
                                        <button
                                            className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200"
                                            onClick={() => removeFile(fileUploadProgress.File)}
                                            disabled={deletingImage === fileUploadProgress.File.name} // Disable the button during deletion
                                        >
                                            {deletingImage === fileUploadProgress.File.name ? "Deleting..." : <X className="w-4 h-4 text-red-600" />}
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
});

export default ImageUpload2;
