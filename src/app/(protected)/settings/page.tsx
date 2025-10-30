"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SettingSchema } from "@/src/schemas";

import { Card, CardHeader, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import {
  getNewReleseList,
  settings,
  updateNewRelese,
} from "@/src/actions/settings";
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { FormError } from "@/src/components/form-error";
import { FormSuccess } from "@/src/components/form-success";
import { Label } from "@/src/components/ui/label";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { removeImage, uploadImage } from "@/src/lib/upload";

const SettingsPage = () => {
  const user = useCurrentUser();

  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [newReleseList, setNewReleseList] = useState<any[]>([]);
  const [selectedKurti, setSelectedKurti] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<z.infer<typeof SettingSchema>>({
    resolver: zodResolver(SettingSchema),
    defaultValues: {
      password: undefined,
      newPassword: undefined,
      // qrCode: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof SettingSchema>) => {
    startTransition(() => {
      console.log("Uploaded QR Code File:", values.qrCode);

      settings(values)
        .then((data) => {
          if (data.error) {
            setError(data.error);
          }

          if (data.success) {
            update();
            setSuccess(data.success);
          }
        })
        .catch(() => setError("Something went wrong!"));
    });
  };
  const getNewReleses = async () => {
    try {
      console.log("its insde");

      setLoading(true);
      const res = await getNewReleseList();
      if (res?.success && Array.isArray(res.newReleseDataList)) {
        setNewReleseList(res.newReleseDataList);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getNewReleses();
  }, []);

  const handleSave = async () => {
    if (!selectedKurti) return;
    console.log("selectedKurti", selectedKurti);

    const res = await updateNewRelese(selectedKurti.id, {
      title: selectedKurti.title,
      startPrice: selectedKurti.startPrice,
      endPrice: selectedKurti.endPrice,
      imageUrl: selectedKurti.imageUrl,
      imagePath: selectedKurti.imagePath,
    });

    if (res.success) {
      await getNewReleses(); // refresh list
      setSelectedKurti(null);
    } else {
      console.error("Update failed:", res.message);
    }
  };
  const [passwordType, setPasswordType] = useState("password");
  return (
    <>
      <Card className="rounded-none w-full h-full">
        <CardHeader>
          <p className="text-2xl font-semibold text-center">⚙️ Settings</p>
        </CardHeader>
        <CardContent>
          <Label className="space-y-2">Name</Label>
          <Input
            className="space-y-2"
            value={user?.name || ""}
            disabled={true}
          />

          <Label>Email</Label>
          <Input value={user?.email || ""} disabled />

          <Label>Role</Label>
          <Input value={user?.role || ""} disabled />

          <Label>Organization</Label>
          <Input value={user?.organization || ""} disabled />

          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="******"
                            type={passwordType}
                          />
                          <div
                            className="absolute top-2.5 right-3 cursor-pointer"
                            onClick={() =>
                              setPasswordType(
                                passwordType === "password"
                                  ? "text"
                                  : "password"
                              )
                            }
                          >
                            {passwordType === "text" ? (
                              <FaRegEye />
                            ) : (
                              <FaRegEyeSlash />
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* New Password Field */}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="******"
                            type={passwordType}
                          />
                          <div
                            className="absolute top-2.5 right-3 cursor-pointer"
                            onClick={() =>
                              setPasswordType(
                                passwordType === "password"
                                  ? "text"
                                  : "password"
                              )
                            }
                          >
                            {passwordType === "text" ? (
                              <FaRegEye />
                            ) : (
                              <FaRegEyeSlash />
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment QR Code Upload */}
                <FormField
                  control={form.control}
                  name="qrCode"
                  render={({ field: { onChange } }) => (
                    <FormItem>
                      <FormLabel>Payment QR Code</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={isPending}
                          onChange={(e) => {
                            onChange(e.target.files?.[0]); // save file in form state
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormError message={error} />
              <FormSuccess message={success} />

              <Button disabled={isPending} type="submit">
                Update
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card className="w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <h2 className="text-2xl font-semibold mb-4">New Release Kurtis</h2>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2">#</th>
                    <th className="border px-4 py-2">Image</th>
                    <th className="border px-4 py-2">Title</th>
                    <th className="border px-4 py-2">Start Price</th>
                    <th className="border px-4 py-2">End Price</th>
                    <th className="border px-4 py-2">Added On</th>
                    <th className="border px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(newReleseList) && newReleseList.length > 0 ? (
                    newReleseList.map((kurti, index) => (
                      <tr key={kurti.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{index + 1}</td>
                        <td className="border px-4 py-2">
                          <img
                            src={kurti.imageUrl}
                            alt={kurti.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        </td>
                        <td className="border px-4 py-2">{kurti.title}</td>
                        <td className="border px-4 py-2">
                          ₹{kurti.startPrice}
                        </td>
                        <td className="border px-4 py-2">₹{kurti.endPrice}</td>
                        <td className="border px-4 py-2">
                          {new Date(kurti.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border px-4 py-2 text-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Pencil
                                size={18}
                                className="cursor-pointer text-blue-600 hover:text-blue-800"
                                onClick={() => setSelectedKurti(kurti)}
                              />
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Kurti</DialogTitle>
                              </DialogHeader>
                              {selectedKurti && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium">
                                      Title
                                    </label>
                                    <Input
                                      value={selectedKurti.title}
                                      onChange={(e) =>
                                        setSelectedKurti({
                                          ...selectedKurti,
                                          title: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium">
                                      Image
                                    </label>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploadingImage(true);
                                        try {
                                          const uploaded = await uploadImage(
                                            file
                                          );
                                          console.log("uploaded", uploaded);

                                          setSelectedKurti({
                                            ...selectedKurti,
                                            imageUrl: uploaded.url,
                                            imagePath: uploaded.path, // store path for deletion later
                                          });
                                          // toast.success("Image uploaded");
                                        } catch (err) {
                                          console.log(
                                            "error in image upload",
                                            err
                                          );

                                          // toast.error("Upload failed");
                                        } finally {
                                          setUploadingImage(false); // stop loader
                                        }
                                      }}
                                    />

                                    {selectedKurti?.image && (
                                      <div className="mt-2 relative">
                                        <img
                                          src={selectedKurti.image}
                                          alt="Preview"
                                          className="w-24 h-24 rounded object-cover"
                                        />
                                        <button
                                          type="button"
                                          className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                                          onClick={async () => {
                                            if (selectedKurti.imagePath) {
                                              await removeImage(
                                                selectedKurti.imagePath
                                              );
                                            }
                                            setSelectedKurti({
                                              ...selectedKurti,
                                              image: "",
                                              imagePath: "",
                                            });
                                          }}
                                        >
                                          ❌
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setSelectedKurti(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleSave}
                                      disabled={uploadingImage}
                                    >
                                      {uploadingImage ? "Uploading..." : "Save"}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default SettingsPage;