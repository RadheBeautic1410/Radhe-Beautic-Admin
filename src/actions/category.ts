"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getPartybyId, getPartybyName } from "../data/party";
import {
  getAllCategory,
  getCategoryByID,
  getCategorybyName,
} from "../data/category";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface partyAddtionProps {
  name: string;
}

interface categoryAddtionProps {
  name: string;
  type: string;
  image?: string;
  bigPrice?: number | null;
  walletDiscount?: number;
}

export const categoryAddition = async (data: categoryAddtionProps) => {
  const user = await currentUser();
  const role = await currentRole();

  const { name, type, image, bigPrice } = data;
  if (name.length === 0) {
    return { error: "Category Can't be empty" };
  }
  const lowercaseName = name.toLowerCase();

  const dbCategory = await getCategorybyName(lowercaseName);
  let code = lowercaseName.toUpperCase().substring(0, 3);
  const allCategory: any[] = (await getAllCategory()) || [];
  let arr: any[] = [];
  for (let i = 0; i < allCategory?.length; i++) {
    arr.push(allCategory[i].code);
  }
  let cnt = 0;
  while (arr.includes(code)) {
    cnt++;
    if (cnt === 10) {
      break;
    }
    code = code.substring(0, 2).concat(String(cnt));
  }
  if (dbCategory || cnt === 10) {
    return { error: "Category Already Exist" };
  }

  // const existingCategory = await db.category.findUnique({
  //     where: {
  //         normalizedLowerCase: category.toLowerCase(),
  //     },
  //     include: {
  //         deleted: true,
  //     },
  // });

  // if (existingCategory) {
  //     if (existingCategory.deleted) {
  //         // Prompt user to restore the category or choose a new name
  //         throw new Error(`A category with the name "${category}" is soft-deleted. Do you want to restore it?`);
  //     } else {
  //         // Handle case where an active category with the same name exists
  //         throw new Error(`A category with the name "${category}" already exists.`);
  //     }
  // }

  await db.category.create({
    data: {
      normalizedLowerCase: lowercaseName,
      name,
      code,
      type: type.toUpperCase(),
      image: image || "",
      bigPrice: bigPrice || null,
    },
  });

  const dbCategoryFetch = await getCategorybyName(lowercaseName);
  return { success: "category Added!", data: dbCategoryFetch };
};

export const categoryDelete = async (id: string) => {
  const user = await currentUser();

  const role = await currentRole();

  const dbparty = await getCategoryByID(id);

  if (!dbparty) {
    return { error: "party does not exist" };
  }

  const deletedCategory = await db.category.delete({
    where: { id: id },
  });

  return { success: "Deletion Success!", deletedCategory };
};

export const categoryTypeUpdate = async (
  lowercaseName: string,
  newType: string
) => {
  const newCategory = await db.category.update({
    where: { normalizedLowerCase: lowercaseName },
    data: {
      type: newType,
    },
  });

  return { success: "Update Done!", newCategory };
};

export const categoryUpdate = async (
  id: string,
  data: categoryAddtionProps
) => {
  const user = await currentUser();
  const role = await currentRole();

  const { name, type, image, bigPrice, walletDiscount } = data;

  if (name.length === 0) {
    return { error: "Category Can't be empty" };
  }

  const lowercaseName = name.toLowerCase();

  const dbCategory = await getCategorybyName(lowercaseName);

  if (dbCategory && dbCategory.id !== id) {
    return { error: "Category Already Exist" };
  }

  const existingCategory = await getCategoryByID(id);
  if (!existingCategory) {
    return { error: "Category does not exist" };
  }

  const result = await db.$transaction(async (prisma) => {
    const updatedCategory = await prisma.category.update({
      where: { id: id },
      data: {
        normalizedLowerCase: lowercaseName,
        name,
        type: type.toUpperCase(),
        image: image ?? existingCategory.image,
        bigPrice: bigPrice ?? existingCategory.bigPrice,
        walletDiscount: walletDiscount ?? existingCategory.walletDiscount,
      },
    });

    if (bigPrice !== undefined && bigPrice !== existingCategory.bigPrice) {
      const categoryName = updatedCategory.name;

      const updatedKurtis = await prisma.kurti.updateMany({
        where: {
          category: categoryName,
          isBigPrice: true,
        },
        data: {
          bigPrice: bigPrice,
        },
      });
    }

    return updatedCategory;
  });

  return { success: "category Updated!", data: result };
};

export async function generateCategoryPDF(categoryCode: string) {
  try {
    const category = await db.category.findUnique({
      where: { code: categoryCode?.toUpperCase() },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    const kurtis = await db.kurti.findMany({
      where: {
        category: category.name,
        isDeleted: false,
      },
      select: {
        code: true,
        category: true,
        sizes: true,
      },
    });

    // Generate PDF buffer
    const pdfBuffer = await generatePDFBuffer(kurtis, category.name);

    // Convert buffer to base64 for client-side download
    const base64PDF = pdfBuffer.toString("base64");

    return {
      success: true,
      pdfData: base64PDF,
      filename: `${categoryCode}_inventory_${
        new Date().toISOString().split("T")[0]
      }.pdf`,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}

async function generatePDFBuffer(
  kurtis: any[],
  categoryName: string
): Promise<Buffer> {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const title = `Kurti Stock Report - ${categoryName}`;
    const titleWidth = doc.getTextWidth(title);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, (pageWidth - titleWidth) / 2, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dateText = `Generated on: ${new Date().toLocaleString()}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 30);

    const tableData: string[][] = [];

    for (const kurti of kurtis) {
      const sizes = Array.isArray(kurti.sizes) ? kurti.sizes : [];

      if (sizes.length === 0) {
        tableData.push([
          kurti.code || "",
          kurti.category || "",
          "-",
          "0",
          "", // Checkbox symbol
        ]);
      } else {
        for (const sizeData of sizes) {
          tableData.push([
            kurti.code || "",
            kurti.category || "",
            sizeData.size || "-",
            (sizeData.quantity || 0).toString(),
            "",
          ]);
        }
      }
    }

    autoTable(doc, {
      startY: 40,
      head: [["Kurti Code", "Category", "Size", "Stock Qty", "Store Qty"]],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [74, 85, 104],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
      },
      alternateRowStyles: {
        fillColor: [247, 250, 252], // Light gray for alternate rows
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5,
      margin: { left: 15, right: 15 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    // Add background rectangle for total
    doc.setFillColor(226, 232, 240);
    doc.rect(15, finalY - 5, pageWidth - 30, 15, "F");

    // Add total text
    const totalText = `Total Items: ${kurtis.length}`;
    const totalWidth = doc.getTextWidth(totalText);
    doc.text(totalText, (pageWidth - totalWidth) / 2, finalY + 5);

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const pdfArrayBuffer = doc.output("arraybuffer");
    return Buffer.from(pdfArrayBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
}

export async function downloadPDF(categoryCode: string) {
  const result = await generateCategoryPDF(categoryCode);

  if (!result.success) {
    throw new Error(result.error);
  }

  return {
    base64: result.pdfData,
    filename: result.filename,
    mimeType: "application/pdf",
  };
}

export async function generateMultipleCategoryPDFs(categoryCodes: string[]) {
  const results = [];

  for (const categoryCode of categoryCodes) {
    try {
      const result = await generateCategoryPDF(categoryCode);
      results.push({ categoryCode, ...result });
    } catch (error) {
      results.push({
        categoryCode,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export const getCategoryOverallStates = async () => {
  try {
    const categories = await db.category.findMany({
      where: {
        isDeleted: false,
      },
    });

    let totalItems = 0;
    let totalPices = 0;
    let totalStockPrice = 0;

    for (let index = 0; index < categories.length; index++) {
      const item = categories[index];
      totalItems = totalItems + item.totalItems;
      totalPices = totalPices + item.countTotal;
      if (item.actualPrice && item.countTotal && item.totalItems) {
        totalStockPrice = totalStockPrice + item?.totalItems * item.actualPrice;
      }
    }

    return {
      totalItems,
      totalPices,
      totalStockPrice,
    };
  } catch (error) {
    console.error("Error fetching states:", error);
    return {
      totalItems: 0,
      totalPices: 0,
      totalStockPrice: 0,
    };
  }
};

export const clearStockData = async (categoryCode: string) => {
  try {
    const category = await db.category.findUnique({
      where: {
        code: categoryCode,
      },
    });

    if (!category) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    const kurtis = await db.kurti.findMany({
      where: {
        category: category.name,
        isDeleted: false,
      },
    });
    if (kurtis.length === 0) {
      return {
        success: false,
        error: "No kurtis found in this category",
      };
    }

    await db.kurti.updateMany({
      where: {
        category: category.name,
      },
      data: {
        sizes: [],
        countOfPiece: 0,
        reservedSizes: [],
        lastUpdatedTime: new Date(),
      },
    });

    await db.category.update({
      where: {
        code: categoryCode,
      },
      data: {
        totalItems: 0,
        countTotal: 0,
        isStockReady: false,
      },
    });
    return {
      success: true,
      message: "Stock cleared successfully",
    };
  } catch (error) {
    console.error("Error fetching category data:", error);
    return {
      success: false,
      error: "Failed to fetch category data",
    };
  }
};

export const setStockReady = async (categoryCode: string) => {
  try {
    const category = await db.category.findUnique({
      where: {
        code: categoryCode,
      },
    });

    if (!category) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    if (category.isStockReady) {
      return {
        success: false,
        error: "Stock is already marked as ready",
      };
    }

    await db.category.update({
      where: {
        code: categoryCode,
      },
      data: {
        isStockReady: true,
      },
    });

    return {
      success: true,
      message: "Stock marked as ready successfully",
    };
  } catch (error) {
    console.error("Error setting stock ready:", error);
    return {
      success: false,
      error: "Failed to set stock ready",
    };
  }
}