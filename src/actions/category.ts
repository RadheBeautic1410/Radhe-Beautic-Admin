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
