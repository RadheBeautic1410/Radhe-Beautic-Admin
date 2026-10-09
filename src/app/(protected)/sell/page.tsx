"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import {
  LOCATION_LABELS,
  STOCK_LOCATIONS,
  StockLocation,
  describeLocations,
  isStockLocation,
  locationForShopId,
} from "@/src/lib/godown";
import { getUserShop } from "@/src/actions/shop";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { UserRole } from "@prisma/client";
import { Value } from "@radix-ui/react-select";
import axios from "axios";
import { Axis3D, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";

const getCurrTime = () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};

function SellPage() {
  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [selling, setSelling] = useState(false);
  const [sizes, setSellSize] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  // Which location the piece is sold from; remembered on this device.
  const [floor, setFloor] = useState<StockLocation | null>(null);
  // Shop logins (1st floor, 2nd floor, Shop 316) always sell their own location.
  const [lockedLocation, setLockedLocation] = useState<StockLocation | null>(null);
  const isShopLogin = currentUser?.role === UserRole.SHOP_SELLER;
  useEffect(() => {
    if (isShopLogin) return;
    try {
      const saved = localStorage.getItem("sellFloor");
      if (isStockLocation(saved)) setFloor(saved);
    } catch {}
  }, [isShopLogin]);
  useEffect(() => {
    if (!isShopLogin || !currentUser?.id) return;
    setFloor(null);
    getUserShop(currentUser.id)
      .then((shop) => {
        const loc = locationForShopId(shop?.id);
        if (loc) {
          setLockedLocation(loc);
          setFloor(loc);
        }
      })
      .catch(() => {});
  }, [isShopLogin, currentUser?.id]);
  // WhatsApp / online order: stock still comes off `floor`, but the report counts
  // it as an online sale. Stays ticked for the whole order; not remembered.
  const [isOnlineOrder, setIsOnlineOrder] = useState(false);
  // Hall sale: the piece can be picked up from any location (even on a shop
  // login), and the report counts it as a hall sale. Not remembered.
  const [isHallSale, setIsHallSale] = useState(false);
  const locationLocked = !!lockedLocation && !isHallSale;
  const chooseFloor = (loc: StockLocation) => {
    if (locationLocked) return;
    setFloor(loc);
    if (lockedLocation) return; // hall sale on a shop login: don't remember
    try {
      localStorage.setItem("sellFloor", loc);
    } catch {}
  };
  const toggleHallSale = (checked: boolean) => {
    setIsHallSale(checked);
    if (checked) setIsOnlineOrder(false);
    // Back to a normal sale: a shop login sells its own location again.
    else if (lockedLocation) setFloor(lockedLocation);
  };
  // console.log(currentUser);
  const handleSell = async () => {
    try {
      setSelling(true);
      setErrorMessage(null); // Clear previous error
      if (!floor) {
        const errorMsg = "Choose which location you are selling from";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } else if (code.length < 7) {
        const errorMsg = "Please enter correct code!!!";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } else {
        console.log(currentUser);
        const currentTime = new Date();

        // Calculate the offset for IST (UTC+5:30)
        const ISTOffset = 5.5 * 60 * 60 * 1000;

        // Convert the local time to IST
        const ISTTime = new Date(currentTime.getTime() + ISTOffset);
        const res = await axios.post(`/api/sell`, {
          code,
          currentUser,
          currentTime: ISTTime,
          stockLocation: floor,
          isOnlineOrder,
          isHallSale,
        });
        // const response = await fetch(`/api/sell?code=${code}`); // Adjust the API endpoint based on your actual setup
        // const result = await response.json();
        console.log(res.data);
        const data = res.data.data;
        if (data.error) {
          setErrorMessage(data.error);
          toast.error(data.error);
          setKurti(null);
        } else {
          setErrorMessage(null); // Clear error on success
          toast.success(
            isOnlineOrder ? "Sold as online order" : isHallSale ? "Sold as hall sale" : "Sold Successfully"
          );
          // console.log(result);

          setKurti(data.kurti);
          setSellSize(data.kurti.sizes.length);
        }
      }

      // const sortedCategory = (result.data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
      // setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMsg = "Failed to process sale. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCode("");
      setSelling(false);
    }
  };

  // const handleCheck = ()=>{
  //     console.log(code);
  //     if (code.length > 7) {
  //         let selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
  //         let temp = code.substring(7).toUpperCase();
  //         if(selectSizes.includes(temp)){
  //             handleSell();
  //         }
  //     }
  // }

  return (
    <Card className="rounded-none w-full h-full">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">🛒 Sell</p>
      </CardHeader>
      <CardContent className="w-full flex flex-col space-evenely justify-center flex-wrap gap-3">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Selling from:</span>
          {STOCK_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              disabled={locationLocked && loc !== lockedLocation}
              onClick={() => chooseFloor(loc)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                floor === loc
                  ? "bg-slate-800 border-slate-800 text-white"
                  : locationLocked
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {LOCATION_LABELS[loc]}
            </button>
          ))}
        </div>
        <label
          className={`flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer ${
            isOnlineOrder
              ? "bg-amber-100 border-amber-400 text-amber-900"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isOnlineOrder}
            onChange={(e) => {
              setIsOnlineOrder(e.target.checked);
              if (e.target.checked) toggleHallSale(false);
            }}
          />
          Online order (WhatsApp)
          {isOnlineOrder && (
            <span className="font-normal text-xs">
              - counted as an online sale; untick for counter sales
            </span>
          )}
        </label>
        <label
          className={`flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer ${
            isHallSale
              ? "bg-purple-100 border-purple-400 text-purple-900"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isHallSale}
            onChange={(e) => toggleHallSale(e.target.checked)}
          />
          Hall sale
          {isHallSale && (
            <span className="font-normal text-xs">
              - pick the location the piece came from; counted as a hall sale
            </span>
          )}
        </label>
        <div className="flex flex-row flex-wrap gap-2">
          <div className="flex flex-col flex-wrap">
            <h3>Product Code</h3>
            <Input
              className={`w-[100%] ${errorMessage ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              placeholder="Enter code"
              value={code}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  handleSell();
                }
              }}
              onChange={(e) => {
                setCode(e.target.value);
                setErrorMessage(null); // Clear error when user types
              }}
              // disabled
            ></Input>
            {errorMessage && (
              <p className="text-red-500 text-sm font-medium mt-1 flex items-center gap-1">
                <span className="text-red-600">⚠</span>
                {errorMessage}
              </p>
            )}
          </div>
          <Button
            type="button"
            className="mt-5"
            onClick={handleSell}
            disabled={selling}
          >
            {selling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
            Sell
          </Button>
        </div>
        {kurti ? (
          <div id="container" className="p-3 bg-slate-300 mt-3 w-[320px]">
            <div className="w-[1000px] h-[1000px]" hidden>
              <img
                id={kurti.code}
                className="h-full w-full object-cover"
                src={kurti.images[0].url}
                crossOrigin="anonymous"
              ></img>
            </div>
            <img
              id={`${kurti.code}-visible`}
              src={kurti.images[0].url}
              crossOrigin="anonymous"
              height={"300px"}
              width={"300px"}
            ></img>

            <p
              key={"code"}
              className="font-bold"
            >{`Code: ${kurti.code.toUpperCase()}`}</p>
            {/* <p 
              key={"price"}
              className="text-2xl font-semibold mt-2 mb-1"
            >{`Price - ${kurti.sellingPrice}/-`}</p>*/}
            <div className="flex flex-row space-evenely mb-2 gap-2">
              <Table className="border border-collapse border-red">
                <TableHeader className="border border-red text-white bg-slate-800">
                  <TableHead className="font-bold border border-red text-white bg-slate-800">
                    SIZE
                  </TableHead>
                  <TableHead className="font-bold border border-red text-white bg-slate-800">
                    STOCK
                  </TableHead>
                </TableHeader>
                <TableBody>
                  {kurti.sizes.map((sz: any, i: number) => {
                    if (i > Math.floor(sizes / 2)) {
                      return "";
                    }
                    return (
                      <TableRow key={i}>
                        <TableCell className="border border-red">
                          {sz.size.toUpperCase()}
                        </TableCell>
                        <TableCell className="border border-red">
                          {sz.quantity}
                          <span className="block text-[10px] text-gray-500">{describeLocations(sz)}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Table className="border border-collapse border-red">
                <TableHeader className="border border-red text-white bg-slate-800">
                  <TableHead className="font-bold border border-red text-white bg-slate-800">
                    SIZE
                  </TableHead>
                  <TableHead className="font-bold border border-red text-white bg-slate-800">
                    STOCK
                  </TableHead>
                </TableHeader>
                <TableBody>
                  {kurti.sizes.map((sz: any, i: number) => {
                    if (i <= Math.floor(sizes / 2)) {
                      return "";
                    }
                    return (
                      <TableRow key={i}>
                        <TableCell className="border border-red">
                          {sz.size.toUpperCase()}
                        </TableCell>
                        <TableCell className="border border-red">
                          {sz.quantity}
                          <span className="block text-[10px] text-gray-500">{describeLocations(sz)}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* <Button type='button' onClick={handleClick} variant={'outline'} key={'download'}>⬇️</Button>
                <Link href={`${pathname}/${kurti.code.toLowerCase()}`} className='mt-0 pt-0'>
                    <Button type='button' className="ml-3" variant={'outline'} key={'edit'}>
                        ✏️
                    </Button>
                </Link> */}
          </div>
        ) : (
          ""
        )}
      </CardContent>
    </Card>
  );
}

const SellerHelp = () => {
  return (
    <>
      <RoleGateForComponent
        allowedRole={[UserRole.ADMIN, UserRole.SELLER, UserRole.SHOP_SELLER]}
      >
        <SellPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default SellerHelp;
