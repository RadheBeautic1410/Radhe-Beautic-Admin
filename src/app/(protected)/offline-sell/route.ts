"use client";
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { useState } from "react";

const prisma = new PrismaClient();
  const [selectedShopId, setSelectedShopId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const handleShopChange = (shopId: string) => {
    setSelectedShopId(shopId);
    setCurrentPage(1); // Reset to first page when changing shop
  };
  try {
    const offlineSales = await prisma.offlineSell.findMany({
      select: {
        shopLocation: true,
        kurti: {
          select: {
            code: true,
            sellingPrice: true,
            actualPrice: true,
          },
        },
      },
    });

    const result = offlineSales.map(sale => ({
      kurtiCode: sale.kurti?.code,
      sellingPrice: sale.kurti?.sellingPrice,
      actualPrice: sale.kurti?.actualPrice,
      shopLocation: sale.shopLocation,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


export async function GET() {
  
}