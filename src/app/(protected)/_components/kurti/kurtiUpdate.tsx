"use client";

import {
  addNewImages,
  categoryChange,
  priceChange,
  stockAddition,
  toggleKurtiBigPrice,
} from "@/src/actions/kurti";
import { DialogDemo } from "@/src/components/dialog-demo";
import { Button } from "@/src/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { Form, useForm } from "react-hook-form";
import { start } from "repl";
import { toast } from "sonner";
import fs from "fs";
import Link from "next/link";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AddSizeForm } from "../dynamicFields/sizes";
// import ImageUpload,  from '../upload/imageUpload';
import ImageUpload2, { ImageUploadRef } from "../upload/imageUpload2";
import { v4 as uuidv4 } from "uuid";
import { Switch } from "@/src/components/ui/switch";
import { SwitchThumb } from "@radix-ui/react-switch";

interface category {
  id: string;
  name: string;
  normalizedLowerCase: string;
}

interface KurtiUpdateProps {
  data: any;
  onKurtiUpdate: (data: any) => void;
}

interface Size {
  size: string;
  quantity: number;
}

const KurtiUpdate: React.FC<KurtiUpdateProps> = ({ data, onKurtiUpdate }) => {
  console.log("🚀 ~ data:", data);
  const [sizes, setSizes] = useState<Size[]>(data?.sizes || []);
  const [components, setComponents] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [actualPrice, setActualPrice] = useState(data?.actualPrice);
  const [sellingPrice, setSellingPrice] = useState(data?.sellingPrice);
  const [downloadSize, setDownloadSize] = useState("");
  const [downloadQuantity, setDownloadQuanitity] = useState(0);
  const [downloading1, setDownloading1] = useState(false);
  const [downloading2, setDownloading2] = useState(false);
  const [allCategory, setAllCategory] = useState<any[]>([]);
  const [changedCategory, setCategory] = useState(data?.category);
  const [uploading, setUploading] = useState(false);
  const [isBigPrice, setIsBigPrice] = useState(data?.isBigPrice || false);

  const router = useRouter();

  const [sizesDownload, setSizesDownload] = useState<Size[]>([]);
  const [componentsDownload, setComponentsDownload] = useState<any[]>([]);
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
  const imageUploadRef = useRef<ImageUploadRef>(null);

  const [images, setImages] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const handleImageChange = (data: any) => {
    setImages(data);
    console.log(data);
  };

  const handleVideoChange = (data: any) => {
    console.log("🚀 ~ handleVideoChange ~ data:", data)
    setVideos(data);
    console.log(data);
  };

  const handleAddSize = (sizes: Size[]) => {
    setSizes(sizes);
  };

  const handleAddSizeDownload = (sizes: Size[]) => {
    setSizesDownload(sizes);
  };

  const handleUpload = () => {
    if (images.length === 0 && videos.length === 0) {
      toast.error("Upload some images");
    } else {
      let allImages: any[] = data.images || [];
      for (let i = 0; i < images.length; i++) {
        allImages.push(images[i]);
      }
      console.log(allImages);
      startTransition(() => {
        addNewImages({
          images: allImages?.map((img) => ({
            url: img.url,
            id: uuidv4(),
            is_hidden: false,
          })),
          code: data.code,
          videos: videos.map((v) => ({
            url: v.url,
            id: uuidv4(),
            is_hidden: false,
          })),
        })
          .then(async (data) => {
            if (data.success) {
              toast.success(data.success);
              setImages([]);
              if (imageUploadRef.current) {
                imageUploadRef.current.reset();
              }
              await onKurtiUpdate(data.kurti);
            }
          })
          .catch((e: any) => {
            toast.error("Something went wrong!!!");
            console.log(e.message);
          });
      });
    }
  };

  const handleDownload = async () => {
    // console.log(sizesDownload)
    // return;
    try {
      setDownloading2(true);
      let obj = JSON.stringify(sizesDownload);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${data.code}`,
        {
          responseType: "blob",
        }
      );
      console.log(res);
      let blob = res.data;
      console.log(blob);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.log(e);
    } finally {
      setComponentsDownload([]);
      setSizesDownload([]);
      setDownloading2(false);
    }
  };

  const handleDownload2 = async () => {
    try {
      setDownloading1(true);
      let obj = JSON.stringify(data.sizes);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${data.code}`,
        {
          responseType: "blob",
        }
      );
      console.log(res);
      let blob = res.data;
      console.log(blob);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.log(e);
    } finally {
      setDownloadQuanitity(0);
      setDownloadSize("");
      setDownloading1(false);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/category"); // Adjust the API endpoint based on your actual setup
        const result = await response.json();
        const sortedCategory = (result.data || []).sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );
        setAllCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        // setCategoryLoader(false);
      }
    };

    fetchData();
    return () => {
      setComponents([]);
    };
  }, [sizes, sizesDownload]);

  const handleStockUpdate = () => {
    startTransition(() => {
      stockAddition({ code: data?.code, sizes: sizes })
        .then((data: any) => {
          console.log(data);
          if (data.error) {
            // formCategory.reset();
            toast.error(data.error);
          }
          if (data.success) {
            // formCategory.reset();
            toast.success(data.success);
            setSizes(data.data);
          }
        })
        .catch((e: any) => {
          console.log(e.message);
          toast.error("Something went wrong!");
        });
    });
  };

  const handlePriceChange = () => {
    startTransition(() => {
      priceChange({
        code: data?.code,
        sellingPrice: sellingPrice,
        actualPrice: actualPrice,
      })
        .then((data: any) => {
          console.log(data);
          if (data.error) {
            // formCategory.reset();
            toast.error(data.error);
          }
          if (data.success) {
            // formCategory.reset();
            toast.success(data.success);
            setSizes(data.data);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  const [generatedCode, setGeneratedCode] = useState("");
  const [generatorLoader, setGeneratorLoader] = useState(false);
  const CodeGenerator = async () => {
    try {
      if (changedCategory === data?.category) {
        setGeneratorLoader(true);
        setGeneratedCode(data?.code);
        setGeneratorLoader(false);
        return;
      }

      const categorySelected = changedCategory;
      if (categorySelected === "") {
        toast.error("Please select the cateory first");
      }
      const response = await fetch(
        `/api/kurti/generateCode?cat=${categorySelected}`
      ); // Adjust the API endpoint based on your actual setup
      const result = await response.json();
      setGeneratedCode(result.code);
      return result;
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setGeneratorLoader(false);
    }
  };

  const handleCategoryChange = async () => {
    const generatedCode = await CodeGenerator();
    if (!generatedCode.code) {
      return;
    }
    startTransition(() => {
      categoryChange({
        code: data?.code,
        category: changedCategory,
        newCode: generatedCode.code,
      })
        .then((data: any) => {
          console.log("🚀 ~ .then ~ data:", data);
          if (data.error) {
            // formCategory.reset();
            toast.error(data.error);
          }
          if (data.success) {
            // formCategory.reset();
            toast.success(data.success);

            router.replace(
              `/catalogue/${data.category}/${data.code.toLowerCase()}`
            );
            // setSizes(data.data);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };
  return (
    <>
      {data ? (
        <div className="flex flex-row flex-wrap space-evenely gap-3">
          <Button className="mr-3" asChild>
            <DialogDemo
              dialogTrigger="Edit Stock"
              dialogTitle="Edit Stock"
              dialogDescription="Edit previous stock or add new stock"
              bgColor="destructive"
            >
              <div className="h-72 overflow-y-scroll w-full">
                <h2>Sizes</h2>
                <AddSizeForm
                  preSizes={sizes}
                  sizes={sizes}
                  onAddSize={handleAddSize}
                />
              </div>
              <Button
                type="button"
                onClick={handleStockUpdate}
                disabled={isPending}
              >
                Save
              </Button>
            </DialogDemo>
          </Button>
          <Button asChild className="ml-3">
            <DialogDemo
              dialogTrigger="Edit Price"
              dialogTitle="Edit Price"
              dialogDescription="Edit previous prices"
              bgColor="destructive"
            >
              <div>
                <h2>Selling Price</h2>
                <Input
                  value={sellingPrice}
                  defaultValue={sellingPrice}
                  onChange={(e) => {
                    setSellingPrice(e.target.value);
                  }}
                ></Input>
                <h2 className="pt-2">Actual Price</h2>
                <Input
                  value={actualPrice}
                  defaultValue={actualPrice}
                  onChange={(e) => {
                    setActualPrice(e.target.value);
                  }}
                ></Input>
              </div>
              <Button
                type="button"
                onClick={handlePriceChange}
                disabled={isPending}
                // onClick={formCategory.handleSubmit(handleSubmitCategory)}
              >
                Save
              </Button>
            </DialogDemo>
          </Button>
          <Button asChild className="ml-3">
            <DialogDemo
              dialogTrigger="Upload New Images/Videos"
              dialogTitle="upload images"
              dialogDescription=""
              bgColor="destructive"
            >
              <div className="h-72 overflow-y-scroll p-1">
                <h2>Images</h2>
                <ImageUpload2
                  allowVideos
                  onImageChange={handleImageChange}
                  images={images}
                  ref={imageUploadRef}
                  onVideoChange={handleVideoChange}
                  videos={videos}
                />
              </div>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploading || isPending}
                // onClick={formCategory.handleSubmit(handleSubmitCategory)}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  ""
                )}
                Upload
              </Button>
            </DialogDemo>
          </Button>
          <Button asChild className="ml-3">
            <DialogDemo
              dialogTrigger="Move Catalogue"
              dialogTitle="Edit Catalogue"
              dialogDescription="Edit previous catalogue"
              bgColor="destructive"
            >
              <div>
                <Select
                  disabled={isPending}
                  onValueChange={(val) => {
                    setCategory(val);
                  }}
                  defaultValue={changedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategory.map((org) => (
                      <SelectItem key={org.id} value={org.name}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  disabled
                  className="mt-1 mb-1"
                  placeholder={"Generate the code"}
                  value={generatedCode.toUpperCase()}
                />
                <Button
                  onClick={CodeGenerator}
                  disabled={generatorLoader}
                  type="button"
                >
                  {generatorLoader ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    ""
                  )}
                  Generate Code
                </Button>
              </div>
              <Button
                type="button"
                onClick={handleCategoryChange}
                disabled={isPending}
                // onClick={formCategory.handleSubmit(handleSubmitCategory)}
              >
                Save
              </Button>
            </DialogDemo>
          </Button>
          <Button onClick={handleDownload2} disabled={downloading1}>
            {downloading1 ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              ""
            )}
            Download Full Stock
          </Button>
          <Button asChild className="ml-3">
            <DialogDemo
              dialogTrigger="Download Barcodes"
              dialogTitle="Enter Size and Quantity"
              dialogDescription=""
              bgColor="destructive"
            >
              <div>
                <h2>Size</h2>
                <AddSizeForm
                  preSizes={[]}
                  sizes={sizesDownload}
                  onAddSize={handleAddSizeDownload}
                />
              </div>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={downloading2}
                // onClick={formCategory.handleSubmit(handleSubmitCategory)}
              >
                {downloading2 ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  ""
                )}
                Download
              </Button>
            </DialogDemo>
          </Button>
          <div className="flex flex-row items-center gap-4">
          <h2>Big Price</h2>
          <Switch
            checked={isBigPrice}
            onCheckedChange={async(e: boolean) => {
              await toggleKurtiBigPrice(data?.id, e);
              setIsBigPrice(e);
              onKurtiUpdate({ ...data, isBigPrice: e });
            }}
            >
            <SwitchThumb />
          </Switch>
            </div>
        </div>
      ) : (
        ""
      )}
    </>
  );
};

export default KurtiUpdate;
