"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getKurtiByCode } from "../data/kurti";

export const getCurrTime = async () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};

export const kurtiAddition = async (data: any) => {
  const user = await currentUser();
  const role = await currentRole();

  const { code, countOfPiece, category, sizes } = data;
  let cnt = 0;
  for (let i = 0; i < sizes.length; i++) {
    cnt += sizes[i].quantity;
  }
  const currTime = await getCurrTime();
  let dataWithTime = data;
  dataWithTime["countOfPiece"] = cnt;
  dataWithTime["lastUpdatedTime"] = currTime;
  dataWithTime["reservedSizes"] = [];
  console.log(dataWithTime);

  // Check if the selected category has prices set
  const categoryData = await db.category.findUnique({
    where: {
      normalizedLowerCase: category.toLowerCase(),
    },
  });

  // If category has no sellingPrice or actualPrice, use user-entered values
  let finalSellingPrice = data.sellingPrice;
  let finalActualPrice = data.actualPrice;
  let finalCustomerPrice = data.customerPrice || data.sellingPrice; // Default to sellingPrice if not provided

  if (categoryData) {
    // If category has no sellingPrice, use user-entered sellingPrice
    if (!categoryData.sellingPrice || categoryData.sellingPrice === 0) {
      finalSellingPrice = data.sellingPrice;
    } else {
      // Use category's sellingPrice if available
      finalSellingPrice = categoryData.sellingPrice.toString();
    }

    // If category has no actualPrice, use user-entered actualPrice
    if (!categoryData.actualPrice || categoryData.actualPrice === 0) {
      finalActualPrice = data.actualPrice;
    } else {
      // Use category's actualPrice if available
      finalActualPrice = categoryData.actualPrice.toString();
    }

    // If category has no customerPrice, use user-entered customerPrice
    if (!categoryData.customerPrice || categoryData.customerPrice === 0) {
      finalCustomerPrice = data.customerPrice || data.sellingPrice;
    } else {
      // Use category's customerPrice if available
      finalCustomerPrice = categoryData.customerPrice.toString();
    }
  }

  // Update the data with final prices
  dataWithTime["sellingPrice"] = finalSellingPrice;
  dataWithTime["actualPrice"] = finalActualPrice;
  dataWithTime["customerPrice"] = finalCustomerPrice;

  let obj = {
    sellingPrice1: parseInt(finalSellingPrice || "0"),
    sellingPrice2: parseInt(finalSellingPrice || "0"),
    sellingPrice3: parseInt(finalSellingPrice || "0"),
    actualPrice1: parseInt(finalActualPrice || "0"),
    actualPrice2: parseInt(finalActualPrice || "0"),
    actualPrice3: parseInt(finalActualPrice || "0"),
  };
  const price = await db.prices.create({
    data: obj,
  });
  dataWithTime["pricesId"] = price.id;
  await db.kurti.create({
    data: dataWithTime,
  });
  await db.category.update({
    where: {
      normalizedLowerCase: category.toLowerCase(),
    },
    data: {
      countTotal: {
        increment: data.countOfPiece,
      },
      totalItems: {
        increment: 1,
      },
    },
  });

  const dbpartyFetch = await getKurtiByCode(code);
  return { success: "Catalog Added!", data: dbpartyFetch };
};

function isDigit(character: any) {
  return !isNaN(parseInt(character)) && isFinite(character);
}

function isSize(size: string) {
  let arr: string[] = [
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
  return arr.includes(size);
}

// export const stockAddition = async (data: any) => {

//   // const user = await currentUser();
//   // const role = await currentRole();
//   console.log(data);
//   const { code, sizes } = data;
//   let cnt = 0;
//   for (let i = 0; i < sizes.length; i++) {
//     cnt += sizes[i].quantity;
//   }
//   console.log(code);
//   let kurti: any = await db.kurti.findUnique({
//     where: {
//       code: code,
//     },
//   });

//   const currTime = await getCurrTime();
//   await db.kurti.update({
//     where: { code },
//     data: {
//       sizes: data.sizes,
//       // countOfPiece: cnt,
//       lastUpdatedTime: currTime,
//     },
//   });

//   const dbpartyFetch = await getKurtiByCode(code);
//   return { success: "Stock Updated!", data: dbpartyFetch?.sizes };
// };

export const stockAddition = async (data: any) => {
  const { code, sizes } = data;

  // Step 1: Calculate new total count of pieces from sizes
  let newCount = 0;
  for (let i = 0; i < sizes.length; i++) {
    if (sizes[i].quantity > 0) {
      newCount += sizes[i].quantity;
    }
  }

  // Step 2: Fetch existing Kurti
  const kurti = await db.kurti.findUnique({
    where: { code },
  });

  if (!kurti) throw new Error("Kurti not found");

  const oldCount = kurti.countOfPiece || 0;
  const diff = newCount - oldCount;

  // Step 3: Update Kurti with new sizes and count
  const currTime = await getCurrTime();

  await db.kurti.update({
    where: { code },
    data: {
      sizes,
      countOfPiece: newCount,
      lastUpdatedTime: currTime,
    },
  });

  // Step 4: Update category's countTotal using category code
  if (kurti.category && newCount > 0) {
    await db.category.update({
      where: { code: code.toUpperCase().substring(0, 3) }, // assuming category code is used
      data: {
        countTotal: {
          increment: diff, // could be positive or negative
        },
      },
    });
  }

  const dbpartyFetch = await getKurtiByCode(code);
  return { success: "Stock Updated!", data: dbpartyFetch?.sizes };
};

export const priceChange = async (data: any) => {
  const user = await currentUser();
  const role = await currentRole();

  const { code } = data;

  const currTime = await getCurrTime();
  const updateData: any = {
    sellingPrice: data.sellingPrice,
    actualPrice: data.actualPrice,
    lastUpdatedTime: currTime,
  };
  
  // Only include customerPrice if it's provided
  if (data.customerPrice !== undefined && data.customerPrice !== null && data.customerPrice !== "") {
    updateData.customerPrice = parseFloat(data.customerPrice.toString());
  }
  
  const updatedKurti = await db.kurti.update({
    where: { code },
    data: updateData,
  });
  let obj = {
    sellingPrice1: parseInt(data.sellingPrice || "0"),
    sellingPrice2: parseInt(data.sellingPrice || "0"),
    sellingPrice3: parseInt(data.sellingPrice || "0"),
    actualPrice1: parseInt(data.actualPrice || "0"),
    actualPrice2: parseInt(data.actualPrice || "0"),
    actualPrice3: parseInt(data.actualPrice || "0"),
  };
  await db.prices.update({
    where: {
      id: updatedKurti.pricesId || undefined,
    },
    data: obj,
  });
  const dbpartyFetch = await getKurtiByCode(code);
  return { success: "Price Changed!", data: dbpartyFetch?.sizes };
};

export const categoryChange = async (data: any) => {
  const { code, newCode, category, selectedSizes, isPartialMove, bigPrice } =
    data;
  const currTime = await getCurrTime();

  console.log(
    "its category change",
    code,
    newCode,
    selectedSizes,
    isPartialMove,
    category,
    bigPrice
  );

  // Total pieces in selected sizes
  const pieceCount = selectedSizes.reduce(
    (sum: number, size: any) => sum + (size?.quantity || 0),
    0
  );

  if (isPartialMove) {
    console.log("its inside partial move");

    // Decrease countTotal from old category
    await db.category.update({
      where: { code: code.substring(0, 3) },
      data: {
        countTotal: { decrement: pieceCount - selectedSizes.length },
      },
    });

    // Increase countTotal from new category
    await db.category.update({
      where: { code: newCode.substring(0, 3) },
      data: {
        countTotal: { increment: pieceCount - selectedSizes.length },
      },
    });
  } else {
    console.log("its outside partial move");

    await db.category.update({
      where: { code: code.substring(0, 3) },
      data: {
        countTotal: { decrement: pieceCount - selectedSizes.length },
        totalItems: { decrement: 1 },
      },
    });

    await db.category.update({
      where: { code: newCode.substring(0, 3) },
      data: {
        countTotal: { increment: pieceCount - selectedSizes.length },
        totalItems: { increment: 1 },
      },
    });
  }

  const sanitizeForPrisma = (obj: any) => {
    const sanitized = { ...obj };
    const jsonArrayFields = ["sizes", "reservedSizes", "images"];

    jsonArrayFields.forEach((field) => {
      if (Array.isArray(sanitized[field])) {
        sanitized[field] = sanitized[field].filter((item) => item !== null);
      } else if (sanitized[field] === null || sanitized[field] === undefined) {
        sanitized[field] = [];
      }
    });

    return sanitized;
  };

  const ret = await db.$transaction(
    async (transaction) => {
      const oldKurti = await transaction.kurti.findUnique({
        where: { code, isDeleted: false },
      });

      if (!oldKurti) {
        return { error: "Kurti Not found" };
      }

      // Check if target category exists and needs bigPrice update
      const targetCategory = await transaction.category.findUnique({
        where: { normalizedLowerCase: category.toLowerCase() },
      });

      if (!targetCategory) {
        return { error: "Target category not found" };
      }

      // Update category bigPrice if needed
      if (oldKurti.isBigPrice && !targetCategory.bigPrice && bigPrice) {
        await transaction.category.update({
          where: { normalizedLowerCase: category.toLowerCase() },
          data: { bigPrice: bigPrice },
        });
      }

      let newKurti;

      if (isPartialMove && selectedSizes.length > 0) {
        const selectedSizesSet = selectedSizes.map((s: any) =>
          s.size.toUpperCase()
        );
        const remainingSizes = oldKurti.sizes.filter(
          (size: any) => !selectedSizesSet.includes(size.size.toUpperCase())
        );

        const validRemainingSizes = Array.isArray(remainingSizes)
          ? remainingSizes.filter((size) => size !== null)
          : [];

        await transaction.kurti.update({
          where: { code },
          data: {
            sizes: validRemainingSizes,
            lastUpdatedTime: currTime,
          },
        });

        await transaction.movedKurtiHistory.create({
          data: {
            fromCategory: oldKurti.category,
            toCategory: category,
            oldKurtiCode: code,
            newKurtiCode: newCode,
            sizes: selectedSizes,
            kurti: {
              connect: { code },
            },
          },
        });

        const validSelectedSizes = Array.isArray(selectedSizes)
          ? selectedSizes.filter((size) => size !== null)
          : [];

        const newKurtiData = {
          ...oldKurti,
          category: category,
          code: newCode,
          sizes: validSelectedSizes,
          lastUpdatedTime: currTime,
        };

        delete (newKurtiData as any)?.id;

        const sanitizedData = sanitizeForPrisma({
          ...newKurtiData,
          sizes: validSelectedSizes,
        });

        newKurti = await transaction.kurti.create({
          data: sanitizedData,
        });

        await transaction.category.update({
          where: { normalizedLowerCase: category.toLowerCase() },
          data: {
            countTotal: { increment: 1 },
          },
        });
      } else {
        // Full move
        await transaction.kurti.update({
          where: { code },
          data: {
            isDeleted: true,
            lastUpdatedTime: currTime,
          },
        });

        const newKurtiData = {
          ...oldKurti,
          category: category,
          code: newCode,
          lastUpdatedTime: currTime,
        };

        delete (newKurtiData as any)?.id;

        const sanitizedData = sanitizeForPrisma(newKurtiData);

        newKurti = await transaction.kurti.create({
          data: sanitizedData,
        });

        await transaction.category.update({
          where: { normalizedLowerCase: category.toLowerCase() },
          data: {
            countTotal: { increment: 1 },
          },
        });

        await transaction.movedKurtiHistory.create({
          data: {
            fromCategory: oldKurti.category,
            toCategory: category,
            oldKurtiCode: code,
            newKurtiCode: newCode,
            sizes: sanitizedData.sizes,
            kurti: {
              connect: { code },
            },
          },
        });

        await transaction.category.update({
          where: { normalizedLowerCase: oldKurti.category.toLowerCase() },
          data: {
            countTotal: { decrement: 1 },
          },
        });
      }

      const dbKurtiFetch = await transaction.kurti.findUnique({
        where: { code: newCode },
      });

      return {
        success: isPartialMove
          ? "Selected sizes moved successfully!"
          : "Category changed successfully!",
        code: dbKurtiFetch?.code,
        category: dbKurtiFetch?.category,
        data: dbKurtiFetch,
      };
    },
    {
      timeout: 15000, // ⬅️ Added 15s transaction timeout
      maxWait: 5000,
    }
  );

  return ret;
};

export const deleteCategory = async (data: any) => {
  const { category } = data;

  const currTime = await getCurrTime();

  try {
    // Start a transaction
    await db.$transaction(async (transaction) => {
      const deletedCategoryName = `${category}-deleted-${Date.now()}`;

      // Soft delete the category by setting the deleted flag and modifying the name
      await transaction.category.update({
        where: {
          normalizedLowerCase: category.toLowerCase(),
        },
        data: {
          name: deletedCategoryName,
          isDeleted: true,
        },
      });

      await transaction.kurti.updateMany({
        where: {
          category: {
            mode: "insensitive",
            equals: category.toLowerCase(),
          },
        },
        data: {
          isDeleted: true,
        },
      });
      await transaction.deletetime.update({
        where: {
          owner: "DK@123",
        },
        data: {
          time: currTime,
        },
      });
    });

    return { success: `Category ${category} Deleted` };
  } catch (error) {
    console.error("Transaction failed: ", error);
    throw new Error(`Failed to delete category ${category}`);
  }
};

export const addNewImages = async (data: any) => {
  const { images, videos, code } = data;

  const currTime = await getCurrTime();
  const kurti = await db.kurti.update({
    where: {
      code: code.toUpperCase(),
    },
    data: {
      images: images,
      lastUpdatedTime: currTime,
      videos: videos,
    },
  });
  return { success: `New Images/Videos added`, kurti: kurti };
};

export async function toggleKurtiImageVisibility(
  kurtiId: string,
  imageId: string,
  isHidden: boolean
) {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized - Please login",
      };
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.UPLOADER) {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    if (!kurtiId || !imageId) {
      return {
        success: false,
        error: "Missing required parameters",
      };
    }

    const existingKurti = await db.kurti.findUnique({
      where: {
        id: kurtiId,
        isDeleted: false,
      },
    });

    if (!existingKurti) {
      return {
        success: false,
        error: "Kurti not found",
      };
    }

    const currentImages = existingKurti.images as any[];

    if (!Array.isArray(currentImages)) {
      return {
        success: false,
        error: "Invalid images data",
      };
    }

    const imageIndex = currentImages.findIndex(
      (img: any) => img.id === imageId
    );

    if (imageIndex === -1) {
      return {
        success: false,
        error: "Image not found",
      };
    }

    const updatedImages = [...currentImages];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      is_hidden: isHidden,
    };

    const updatedKurti = await db.kurti.update({
      where: {
        id: kurtiId,
      },
      data: {
        images: updatedImages,
        lastUpdatedTime: new Date(),
      },
    });

    return {
      success: true,
      message: `Image ${isHidden ? "hidden" : "made visible"} successfully`,
      data: updatedKurti,
    };
  } catch (error) {
    console.error("Error toggling image visibility:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export async function toggleKurtiVideoVisibility(
  kurtiId: string,
  videoId: string,
  isHidden: boolean
) {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized - Please login",
      };
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.UPLOADER) {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    if (!kurtiId || !videoId) {
      return {
        success: false,
        error: "Missing required parameters",
      };
    }

    const existingKurti = await db.kurti.findUnique({
      where: {
        id: kurtiId,
        isDeleted: false,
      },
    });

    if (!existingKurti) {
      return {
        success: false,
        error: "Kurti not found",
      };
    }

    const currentVideos = existingKurti.videos as any[];

    if (!Array.isArray(currentVideos)) {
      return {
        success: false,
        error: "Invalid videos data",
      };
    }

    const videoIndex = currentVideos.findIndex(
      (video: any) => video.id === videoId
    );

    if (videoIndex === -1) {
      return {
        success: false,
        error: "Video not found",
      };
    }

    const updatedVideos = [...currentVideos];
    updatedVideos[videoIndex] = {
      ...updatedVideos[videoIndex],
      is_hidden: isHidden,
    };

    const updatedKurti = await db.kurti.update({
      where: {
        id: kurtiId,
      },
      data: {
        videos: updatedVideos,
        lastUpdatedTime: new Date(),
      },
    });

    return {
      success: true,
      message: `Video ${isHidden ? "hidden" : "made visible"} successfully`,
      data: updatedKurti,
    };
  } catch (error) {
    console.error("Error toggling video visibility:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export const toggleKurtiBigPrice = async (
  kurtiId: string,
  isBigPrice: boolean
) => {
  const currTime = await getCurrTime();

  const existingKurti = await db.kurti.findUnique({
    where: {
      id: kurtiId,
    },
  });

  if (!existingKurti) {
    return {
      success: false,
      error: "Kurti not found",
    };
  }

  const category = await db.category.findUnique({
    where: {
      normalizedLowerCase: existingKurti.category.toLowerCase(),
    },
  });

  if (!category?.bigPrice) {
    return {
      success: false,
      error: "Category has no big price, please set it first.",
      code: "NO_BIG_PRICE",
    };
  }

  const updatedKurti = await db.kurti.update({
    where: {
      id: kurtiId,
    },
    data: {
      isBigPrice: isBigPrice,
      bigPrice: isBigPrice ? category.bigPrice : null,
      lastUpdatedTime: currTime,
    },
  });

  const updateKurtiPrices = await db.prices.update({
    where: {
      id: existingKurti.pricesId!,
    },
    data: {
      sellingPrice2: isBigPrice
        ? (category.sellingPrice || 0) + category.bigPrice
        : category.sellingPrice || 0,
      sellingPrice3: isBigPrice
        ? (category.sellingPrice || 0) + category.bigPrice
        : category.sellingPrice || 0,
    },
  });

  return { success: "Kurti Big Size Price Updated!", kurti: updatedKurti };
};

export const fetchMovedKurtiHistory = async () => {
  try {
    const movedKurtis = await db.movedKurtiHistory.findMany({});
    return {
      success: true,
      data: movedKurtis,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const fetchKurtiByCategory = async (category: string) => {
  try {
    const kurties = await db.kurti.findMany({
      where: {
        category: category,
      },
    });

    return {
      data: kurties,
    };
  } catch (error) {
    console.log("🚀 ~ fetchKurtiByCategory ~ error:", error);

    return {
      data: [],
    };
  }
};
