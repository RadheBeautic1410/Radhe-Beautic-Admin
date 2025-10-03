"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useSession } from "next-auth/react";
import { SettingSchema } from "@/src/schemas";

import { Card, CardHeader, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { settings } from "@/src/actions/settings";
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
import QRCodeManager from "@/src/components/qr-code-manager";

const SettingsPage = () => {
  const user = useCurrentUser();

  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();

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
    }
    const [passwordType, setPasswordType] = useState('password');
  return (
    <div className="space-y-6">
      <Card className="rounded-none w-full">
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
                              passwordType === "password" ? "text" : "password"
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
                              passwordType === "password" ? "text" : "password"
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
    
    {/* QR Code Manager */}
    <QRCodeManager />
    </div>
  );
};

export default SettingsPage;
