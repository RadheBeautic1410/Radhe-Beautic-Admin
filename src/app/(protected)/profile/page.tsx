"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Phone, ShieldCheck, Store, User as UserIcon, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { LogoutButton } from "@/src/components/auth/logout-button";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { getUserShop } from "@/src/actions/shop";
import { canOpenMenu } from "@/src/lib/menus";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MOD: "Moderator",
  UPLOADER: "Uploader",
  SELLER: "Seller",
  RESELLER: "Reseller",
  SHOP_SELLER: "Shop Seller",
  SELLER_MANAGER: "Seller Manager",
  USER: "User",
};

const Row = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) => (
  <div className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0">
    <span className="text-gray-400">{icon}</span>
    <span className="w-32 text-sm text-gray-500">{label}</span>
    <span className="flex-1 text-sm font-semibold text-gray-900 break-words">{value || "-"}</span>
  </div>
);

const ProfilePage = () => {
  const user = useCurrentUser();
  const [shopName, setShopName] = useState<string | null>(null);

  // Only shop logins have a shop attached.
  useEffect(() => {
    if (!user?.id || user.role !== "SHOP_SELLER") return;
    getUserShop(user.id)
      .then((shop) => setShopName(shop?.shopName || null))
      .catch(() => {});
  }, [user?.id, user?.role]);

  if (!user) return null;

  const roleLabel =
    user.roleName && user.roleName !== user.role
      ? user.roleName
      : ROLE_LABELS[user.role] || user.role;
  const initial = (user.name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="p-6 flex justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-800 text-3xl font-bold text-white">
            {initial}
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{user.name || "User"}</p>
            <span className="mt-1 inline-block rounded-full bg-pink-50 px-3 py-0.5 text-xs font-bold text-pink-700">
              {roleLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Row icon={<UserIcon className="h-4 w-4" />} label="Name" value={user.name} />
            <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={user.phoneNumber} />
            <Row icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={roleLabel} />
            {user.organization && (
              <Row
                icon={<Building2 className="h-4 w-4" />}
                label="Organization"
                value={user.organization}
              />
            )}
            {shopName && <Row icon={<Store className="h-4 w-4" />} label="Shop" value={shopName} />}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {canOpenMenu("/settings", user) && (
              <Button asChild variant={"outline" as any} className="flex-1">
                <Link href="/settings">Settings &amp; password</Link>
              </Button>
            )}
            <LogoutButton>
              <Button type="button" variant="destructive" className="w-full flex-1 gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </LogoutButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
