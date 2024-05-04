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
import { db } from "@/src/lib/db";

interface ChildProps {
    onImageChange: (data: any) => void;
    images: any[];
}

interface FileUploadProgress {
    progress: number;
    File: File;
    source: CancelTokenSource | null;
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


const ImageUpload = React.forwardRef(({ onImageChange, images }: ChildProps, ref: React.Ref<ImageUploadRef>) => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imgs, setImgs] = useState<any[]>([]);

    const [filesToUpload, setFilesToUpload] = useState<FileUploadProgress[]>([]);

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

    // feel free to mode all these functions to separate utils
    // here is just for simplicity
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

    const removeFile = (file: File) => {
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
        setFilesToUpload((prevUploadProgress) => {
            return prevUploadProgress.filter((item) => item.File !== file);
        });
        setUploadedFiles((prevUploadProgress) => {
            return prevUploadProgress.filter((item) => item !== file);
        });
    };

    const uploadImagetoBB = async (
        formData: FormData,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => void,
        cancelSource: CancelTokenSource
    ) => {
        function getRandomInt(max: number) {
            return Math.floor(Math.random() * (max + 1));
        }
        let apiKeys = [
            'ea969f533a6a89234ee370a812f55fdb',
            'd6a35aefd3aeb6cdb7e9b8f21eb55076',
            '667f5bbe7fb48119d2bd520dbeef5c57',
            '21241fd340a0ce1b864ddfee7f4b880c',
            'ac1aaf39fb0d237b44c2a5a49ea84d65',
            'b5cb435b770e8088ce8ba18747830e1f'
        ]
        let idx = getRandomInt(apiKeys.length - 1);
        return axios.post(
            `https://api.imgbb.com/1/upload?&key=${apiKeys[idx]}`,
            formData,
            {
                onUploadProgress,
                cancelToken: cancelSource.token,
            }
        );
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
                    };
                }),
            ];
        });


        const fileUploadBatch = acceptedFiles.map(async (file) => {
            const formData = new FormData();
            formData.append("image", file);
            const cancelSource = axios.CancelToken.source();
            const res = await uploadImagetoBB(
                formData,
                (progressEvent) => onUploadProgress(progressEvent, file, cancelSource),
                cancelSource
            );
            console.log('xxx', imgs);
            let prevImages = imgs;
            prevImages.push({ url: res.data.data.url });
            setImgs(prevImages);
            onImageChange(prevImages);
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
                                        <div className="flex items-center flex-1 p-2">
                                            <div className="text-white">
                                                {getFileIconAndColor(fileUploadProgress.File).icon}
                                            </div>

                                            <div className="w-full ml-2 space-y-1">
                                                <div className="text-sm flex justify-between">
                                                    <p className="text-muted-foreground ">
                                                        {fileUploadProgress.File.name.slice(0, 25)}
                                                    </p>
                                                    <span className="text-xs">
                                                        {fileUploadProgress.progress}%
                                                    </span>
                                                </div>

                                                <ProgressBar
                                                    progress={fileUploadProgress.progress}
                                                    className={
                                                        getFileIconAndColor(fileUploadProgress.File).color
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (fileUploadProgress.source)
                                                    fileUploadProgress.source.cancel("Upload cancelled");
                                                removeFile(fileUploadProgress.File);
                                            }}
                                            className="bg-red-500 text-white transition-all items-center justify-center cursor-pointer px-2 hidden group-hover:flex"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                </div>
            )}

            {uploadedFiles.length > 0 && (
                <div>
                    <p className="font-medium my-2 mt-6 text-muted-foreground text-sm">
                        Uploaded Files
                    </p>
                    <div className="space-y-2 pr-3">
                        {uploadedFiles.map((file) => {
                            return (
                                <div
                                    key={file.lastModified}
                                    className="flex justify-between gap-2 rounded-lg overflow-hidden border border-slate-100 group hover:pr-0 pr-2 hover:border-slate-300 transition-all"
                                >
                                    <div className="flex items-center flex-1 p-2">
                                        <div className="text-white">
                                            {getFileIconAndColor(file).icon}
                                        </div>
                                        <div className="w-full ml-2 space-y-1">
                                            <div className="text-sm flex justify-between">
                                                <p className="text-muted-foreground ">
                                                    {file.name.slice(0, 25)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(file)}
                                        className="bg-red-500 text-white transition-all items-center justify-center px-2 hidden group-hover:flex"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
})

export default ImageUpload;