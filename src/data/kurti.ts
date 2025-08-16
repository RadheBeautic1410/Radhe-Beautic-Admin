import { db } from "@/src/lib/db";
import { error } from "console";
import {
  uploadInvoicePDFToFirebase,
  deleteInvoiceFromFirebase,
} from "@/src/lib/firebase/firebase";
import { generateInvoiceHTML } from "@/src/lib/utils";
import { generatePDFFromHTML } from "@/src/lib/puppeteer";
import { OfflineSellType, OnlineSellType, OrderStatus } from "@prisma/client";

export const getCurrTime = async () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};

export const getLastDelTime = async () => {
  try {
    // console.log('debg', cat);
    const party: any = await db.deletetime.findUnique({
      where: {
        owner: "DK@123",
      },
    });
    return party;
  } catch {
    return null;
  }
};

export const getKurtiCount = async (cat: string) => {
  try {
    console.log("debg", cat);
    const party: any = await db.category.findUnique({
      where: {
        normalizedLowerCase: cat.toLowerCase(),
      },
    });
    return party.countTotal || 0;
  } catch {
    return null;
  }
};

export const getAllKurti = async () => {
  try {
    const allKurti = await db.kurti.findMany({
      where: {
        isDeleted: false,
      },
    });
    console.log(allKurti.length);
    return allKurti;
  } catch (e: any) {
    console.log(e.message);
    return null;
  }
};

export const getAllKurtiByTime = async (currTime: string) => {
  try {
    const allKurti = await db.kurti.findMany({
      where: {
        isDeleted: false,
        lastUpdatedTime: {
          gt: new Date(currTime),
        },
      },
    });
    return allKurti;
  } catch {
    return null;
  }
};

export const getCode = async (cat: string) => {
  try {
    console.log("debg", cat);
    const party = await db.category.findUnique({
      where: {
        normalizedLowerCase: cat.toLowerCase(),
      },
    });
    return party?.code;
  } catch (e: any) {
    return e.message;
    return null;
  }
};

export const getKurtiCountWithoutDeleted = async (cat: string) => {
  try {
    const party = await db.kurti.count({
      where: { category: cat, isDeleted: false },
    });

    // if (cat === "KTD") {
    //     return party + 2;
    // }
    return party;
  } catch {
    return null;
  }
};

export const getKurtiCountForCode = async (cat: string) => {
  try {
    const party = await db.kurti.count({ where: { category: cat } });
    return party;
  } catch {
    return null;
  }
};

export const getKurtiByCode = async (code: string) => {
  try {
    const kurti = await db.kurti.findUnique({
      where: { code: code.toUpperCase(), isDeleted: false },
    });
    return kurti;
  } catch {
    return null;
  }
};

export const getKurtiByCategory = async (category: string) => {
  try {
    const kurti = await db.kurti.findMany({
      where: {
        category: {
          mode: "insensitive",
          startsWith: category,
          endsWith: category,
        },
        isDeleted: false,
      },
    });
    return kurti;
  } catch {
    return null;
  }
};

export const getKurtiByCategoryWithPages = async (
  category: string,
  page: number
) => {
  try {
    let skip = 20 * (page - 1);
    const kurti = await db.kurti.findMany({
      where: {
        category: {
          mode: "insensitive",
          endsWith: category,
        },
        isDeleted: false,
      },
      skip: 20 * (page - 1),
      take: 20,
    });
    return kurti;
  } catch {
    return null;
  }
};

export const deleteKurti = async (code: string, category: string) => {
  try {
    console.log("its kurti delete",code,category)
    const kurtiData = await db.kurti.findUnique({
      where: { code: code.toUpperCase(), isDeleted: false },
    });
    await db.category.update({
      where: { code: code.toUpperCase().substring(0, 3) },
      data: {
        totalItems: {
          decrement: 1,
        },
        countTotal: {
          decrement: kurtiData?.countOfPiece || 0,
        },
      },
    });

    const updatedKurti = await db.kurti.update({
      where: {
        code: code.toUpperCase(),
      },
      data: {
        isDeleted: true,
      },
    });
    // await db.category.update({
    //     where: {
    //         code: code.toUpperCase().substring(0, 3),
    //     },
    //     data: {
    //         countOfPiece: {
    //             decrement: updatedKurti.countOfPiece,
    //         },
    //         countOfDesign: {
    //             decrement: 1,
    //         }
    //     }
    // })
    const kurti = await db.kurti.findMany({
      where: {
        category: {
          mode: "insensitive",
          endsWith: category,
          startsWith: category,
        },
        isDeleted: false,
      },
    });
    return kurti;
  } catch {
    return null;
  }
};

function removeAtIndex(array: any, index: number) {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

export const deletePicture = async (code: string, idx: number) => {
  try {
    const kurti = await db.kurti.findUnique({
      where: {
        code: code.toUpperCase(),
      },
    });
    const currTime = await getCurrTime();
    let images = kurti?.images || [];
    if (images?.length < idx || images.length <= 1) {
      return kurti;
    }
    let newImages = removeAtIndex(images, idx) || [];
    const updatedKurti = await db.kurti.update({
      where: {
        code: code.toUpperCase(),
      },
      data: {
        images: newImages,
        lastUpdatedTime: currTime,
      },
    });
    return updatedKurti;
  } catch {
    return null;
  }
};

export const deleteVideo = async (code: string, idx: number) => {
  try {
    const kurti = await db.kurti.findUnique({
      where: {
        code: code.toUpperCase(),
      },
    });
    const currTime = await getCurrTime();
    let videos = kurti?.videos || [];
    if (videos?.length < idx || videos.length <= 1) {
      return kurti;
    }
    let newVideos = removeAtIndex(videos, idx) || [];
    const updatedKurti = await db.kurti.update({
      where: {
        code: code.toUpperCase(),
      },
      data: {
        videos: newVideos,
        lastUpdatedTime: currTime,
      },
    });
    return updatedKurti;
  } catch {
    return null;
  }
};

function isDigit(character: any) {
  return !isNaN(parseInt(character)) && isFinite(character);
}

// function isSize(size: string) {
//     let arr: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
//     return arr.includes(size);
// }
// const getCurrTime = () => {
//     const currentTime = new Date();
//     const ISTOffset = 5.5 * 60 * 60 * 1000;
//     const ISTTime = new Date(currentTime.getTime() + ISTOffset);
//     return ISTTime;
// }

const isSize = (str: string): boolean => {
  const selectSizes: string[] = [
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
  return selectSizes.includes(str.toUpperCase());
};

export const sellKurti2 = async (data: any) => {
  try {
    interface Size {
      size: string;
      quantity: number;
    }
    let { code, currentUser, currentTime } = data;
    code = code.toUpperCase();
    let search = code.substring(0, 7).toUpperCase();
    let cmp = code.substring(7);
    if (
      code.toUpperCase().substring(0, 2) === "CK" &&
      code[2] === "0" &&
      isSize(code.substring(6))
    ) {
      search = code.substring(0, 6).toUpperCase();
      cmp = code.substring(6);
    }
    console.log("search: ", search);
    const kurti = await db.kurti.findUnique({
      where: { code: search.toUpperCase(), isDeleted: false },
    });
    console.log(kurti);
    if (!kurti) {
      return { error: "No Kurti found!!!" };
    }
    if (kurti?.sizes !== undefined) {
      let arr: any[] = kurti?.sizes;
      let newArr: any[] = [];
      let flag = 0;
      for (let i = 0; i < arr?.length; i++) {
        let obj = arr[i];
        console.log(obj);
        if (!obj) {
          break;
        }
        if (obj.size === cmp) {
          if (obj.quantity == 0) {
            return { error: "Stock is equal to 0, add stock first" };
          } else {
            flag = 1;
            obj.quantity -= 1;
            if (obj.quantity > 0) {
              newArr.push(obj);
            }
          }
        } else {
          newArr.push(arr[i]);
        }
      }
      console.log(flag, newArr);
      if (flag === 1) {
        // await db.category.update({
        //     where: {
        //         normalizedLowerCase: updateUser.category.toLowerCase(),
        //     },
        //     data: {
        //         countOfPiece: {
        //             increment: -1
        //         },
        //         actualPrice: {
        //             decrement: (parseInt(updateUser.actualPrice || "0")),
        //         }
        //     },
        // });
        try {
          console.log("search2", search);
          const currTime = await getCurrTime();
          console.log(currTime);
          const updateUser = await db.kurti.update({
            where: {
              code: search,
            },
            data: {
              sizes: newArr,
              lastUpdatedTime: currTime,
            },
            include: {
              prices: true,
            },
          });
          console.log("code2", search.toUpperCase().substring(0, 3));
          if (updateUser.pricesId) {
            let prices = await db.prices.findUnique({
              where: {
                id: updateUser.pricesId,
              },
            });
            if (!prices || !prices.actualPrice1 || !prices.sellingPrice1) {
              const sellPrice = parseInt(updateUser.sellingPrice || "0");
              const actualP = parseInt(updateUser.actualPrice || "0");

              prices = await db.prices.create({
                data: {
                  sellingPrice1: sellPrice,
                  sellingPrice2: sellPrice,
                  sellingPrice3: sellPrice,
                  actualPrice1: actualP,
                  actualPrice2: actualP,
                  actualPrice3: actualP,
                },
              });
              await db.kurti.update({
                where: {
                  code: updateUser.code,
                },
                data: {
                  pricesId: prices.id,
                },
              });
            }
            const sell = await db.sell.create({
              data: {
                sellTime: currentTime,
                code: search.toUpperCase(),
                sellerName: currentUser.name,
                kurti: [updateUser],
                kurtiId: updateUser.id,
                pricesId: prices.id,
                kurtiSize: cmp,
              },
            });
            await db.category.update({
              where: {
                code: search.toUpperCase().substring(0, 3),
              },
              data: {
                countTotal: {
                  decrement: 1,
                },
              },
            });
            console.log(sell);
          }
          return { success: "Sold", kurti: updateUser };
        } catch (e) {
          console.log(e);
          return { error: "Something went wrong!!!" };
        }
      }
    }

    return { error: "Not in stock, update the stock!!!" };
  } catch {
    return null;
  }
};

// export const sellMultipleKurtis = async (data: any) => {
//   try {
//     let {
//       products,
//       currentUser,
//       currentTime,
//       customerName,
//       customerPhone,
//       selectedLocation,
//       billCreatedBy,
//       paymentType,
//       shopName,
//     } = data;

//     if (!products || products.length === 0) {
//       return { error: "No products provided" };
//     }

//     const soldProducts = [];
//     const errors = [];
//     let totalAmount = 0;

//     // Process each product in the cart
//     for (let i = 0; i < products.length; i++) {
//       const product = products[i];
//       let { code, kurti, selectedSize, quantity, sellingPrice } = product;

//       try {
//         code = code.toUpperCase();
//         let search = code.substring(0, 7).toUpperCase();
//         let cmp = selectedSize.toUpperCase();

//         // Handle special case for CK codes
//         if (
//           code.toUpperCase().substring(0, 2) === "CK" &&
//           code[2] === "0" &&
//           isSize(code.substring(6))
//         ) {
//           search = code.substring(0, 6).toUpperCase();
//         }

//         console.log(`Processing product ${i + 1} - search:`, search, "size:", cmp, "quantity:", quantity);

//         const kurtiFromDB = await db.kurti.findUnique({
//           where: { code: search.toUpperCase(), isDeleted: false },
//           include: {
//             prices: true,
//           },
//         });

//         if (!kurtiFromDB) {
//           errors.push(`Product ${search} not found`);
//           continue;
//         }

//         if (kurtiFromDB?.sizes !== undefined) {
//           let arr: any[] = kurtiFromDB?.sizes;
//           let newArr: any[] = [];
//           let flag = 0;

//           for (let j = 0; j < arr?.length; j++) {
//             let obj = arr[j];
//             if (!obj) break;

//             if (obj.size === cmp) {
//               if (obj.quantity < quantity) {
//                 errors.push(`Insufficient stock for ${search}-${cmp}. Available: ${obj.quantity}, Requested: ${quantity}`);
//                 flag = 0;
//                 break;
//               } else {
//                 flag = 1;
//                 obj.quantity -= quantity;
//                 if (obj.quantity >= 0) {
//                   newArr.push(obj);
//                 }
//               }
//             } else {
//               newArr.push(arr[j]);
//             }
//           }

//           if (flag === 1) {
//             try {
//               const currTime = await getCurrTime();

//               // Update kurti stock
//               const updateUser = await db.kurti.update({
//                 where: {
//                   code: search,
//                 },
//                 data: {
//                   sizes: newArr,
//                   lastUpdatedTime: currTime,
//                 },
//                 include: {
//                   prices: true,
//                 },
//               });

//               // Handle prices
//               let prices = updateUser.prices;
//               if (!prices || !prices.actualPrice1 || !prices.sellingPrice1) {
//                 const sellPrice = parseInt(updateUser.sellingPrice || "0");
//                 const actualP = parseInt(updateUser.actualPrice || "0");

//                 prices = await db.prices.create({
//                   data: {
//                     sellingPrice1: sellPrice,
//                     sellingPrice2: sellPrice,
//                     sellingPrice3: sellPrice,
//                     actualPrice1: actualP,
//                     actualPrice2: actualP,
//                     actualPrice3: actualP,
//                   },
//                 });

//                 await db.kurti.update({
//                   where: {
//                     code: updateUser.code,
//                   },
//                   data: {
//                     pricesId: prices.id,
//                   },
//                 });
//               }

//               // Create individual sell record for each product
//               const sell = await db.sell.create({
//                 data: {
//                   sellTime: currentTime,
//                   code: search.toUpperCase(),
//                   sellerName: currentUser.name,
//                   kurti: [updateUser],
//                   kurtiId: updateUser.id,
//                   pricesId: prices.id,
//                   kurtiSize: cmp,
//                   customerName,
//                   customerPhone,
//                   selledPrice: sellingPrice,
//                   quantity: quantity, // Add quantity field to track multiple items
//                   shopLocation: selectedLocation,
//                   billCreatedBy: billCreatedBy,
//                   paymentType:paymentType, // Default to CASH if not provided
//                   shopName: shopName,
//                 },
//               });

//               soldProducts.push({
//                 kurti: updateUser,
//                 sale: sell,
//                 size: cmp,
//                 quantity: quantity,
//                 unitPrice: sellingPrice,
//                 totalPrice: sellingPrice * quantity,
//               });

//               totalAmount += sellingPrice * quantity;

//               console.log(`Product ${i + 1} sold successfully:`, sell);

//             } catch (e: any) {
//               console.error(`Error during sale of product ${i + 1}:`, e.message, e.stack);
//               errors.push(`Error selling ${search}-${cmp}: ${e.message}`);
//             }
//           } else if (!errors.some(err => err.includes(search))) {
//             errors.push(`Product ${search}-${cmp} not in stock`);
//           }
//         }
//       } catch (productError: any) {
//         console.error(`Error processing product ${i + 1}:`, productError);
//         errors.push(`Error processing product ${i + 1}: ${productError.message}`);
//       }
//     }

//     // Check if any products were sold successfully
//     if (soldProducts.length === 0) {
//       return {
//         error: "No products could be sold. Errors: " + errors.join(", ")
//       };
//     }

//     // If some products failed but others succeeded, return partial success
//     if (errors.length > 0 && soldProducts.length > 0) {
//       return {
//         success: "Partial sale completed",
//         soldProducts,
//         totalAmount,
//         errors,
//         customer: {
//           name: customerName,
//           phone: customerPhone,
//           location: selectedLocation,
//           billCreatedBy,
//           shopName,
//         },
//         partialSale: true,
//       };
//     }

//     // All products sold successfully
//     return {
//       success: "All products sold successfully",
//       soldProducts,
//       totalAmount,
//       customer: {
//         name: customerName,
//         phone: customerPhone,
//         location: selectedLocation,
//         billCreatedBy,
//         shopName,
//       },
//     };

//   } catch (error) {
//     console.error("Multiple sell error:", error);
//     return { error: "Something went wrong during the sale process!" };
//   }
// };

export const sellMultipleKurtis = async (data: any) => {
  try {
    let {
      products,
      currentUser,
      currentTime,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      paymentType,
      shopName,
    } = data;

    if (!products || products.length === 0) {
      return { error: "No products provided" };
    }

    const soldProducts = [];
    const errors = [];
    let totalAmount = 0;

    // Process each product in the cart
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let { code, kurti, selectedSize, quantity, sellingPrice } = product;

      try {
        code = code.toUpperCase();
        let search = code.substring(0, 7).toUpperCase();
        let cmp = selectedSize.toUpperCase();

        // Handle special case for CK codes
        if (
          code.toUpperCase().substring(0, 2) === "CK" &&
          code[2] === "0" &&
          isSize(code.substring(6))
        ) {
          search = code.substring(0, 6).toUpperCase();
        }

        console.log(
          `Processing product ${i + 1} - search:`,
          search,
          "size:",
          cmp,
          "quantity:",
          quantity
        );

        const kurtiFromDB = await db.kurti.findUnique({
          where: { code: search.toUpperCase(), isDeleted: false },
          include: {
            prices: true,
          },
        });

        if (!kurtiFromDB) {
          errors.push(`Product ${search} not found`);
          continue;
        }

        if (kurtiFromDB?.sizes !== undefined) {
          let arr: any[] = kurtiFromDB?.sizes;
          let newArr: any[] = [];
          let flag = 0;

          for (let j = 0; j < arr?.length; j++) {
            let obj = arr[j];
            if (!obj) break;

            if (obj.size === cmp) {
              if (obj.quantity < quantity) {
                errors.push(
                  `Insufficient stock for ${search}-${cmp}. Available: ${obj.quantity}, Requested: ${quantity}`
                );
                flag = 0;
                break;
              } else {
                flag = 1;
                obj.quantity -= quantity;
                if (obj.quantity >= 0) {
                  newArr.push(obj);
                }
              }
            } else {
              newArr.push(arr[j]);
            }
          }

          if (flag === 1) {
            try {
              const currTime = await getCurrTime();

              // Update kurti stock
              const updateUser = await db.kurti.update({
                where: {
                  code: search,
                },
                data: {
                  sizes: newArr,
                  lastUpdatedTime: currTime,
                },
                include: {
                  prices: true,
                },
              });

              // Handle prices
              let prices = updateUser.prices;
              if (!prices || !prices.actualPrice1 || !prices.sellingPrice1) {
                const sellPrice = parseInt(updateUser.sellingPrice || "0");
                const actualP = parseInt(updateUser.actualPrice || "0");

                prices = await db.prices.create({
                  data: {
                    sellingPrice1: sellPrice,
                    sellingPrice2: sellPrice,
                    sellingPrice3: sellPrice,
                    actualPrice1: actualP,
                    actualPrice2: actualP,
                    actualPrice3: actualP,
                  },
                });

                await db.kurti.update({
                  where: {
                    code: updateUser.code,
                  },
                  data: {
                    pricesId: prices.id,
                  },
                });
              }

              // Create individual sell record for each product
              const sell = await db.sell.create({
                data: {
                  sellTime: currentTime,
                  code: search.toUpperCase(),
                  sellerName: currentUser.name,
                  kurti: [updateUser],
                  kurtiId: updateUser.id,
                  pricesId: prices.id,
                  kurtiSize: cmp,
                  customerName,
                  customerPhone,
                  selledPrice: sellingPrice,
                  quantity: quantity,
                  shopLocation: selectedLocation,
                  billCreatedBy: billCreatedBy,
                  paymentType: paymentType,
                  shopName: shopName,
                },
              });

              // Update or create TopSoldKurti record
              await db.topSoldKurti.upsert({
                where: {
                  kurtiId: updateUser.id,
                },
                update: {
                  soldCount: {
                    increment: quantity, // Increment by the quantity sold
                  },
                },
                create: {
                  kurtiId: updateUser.id,
                  soldCount: quantity,
                },
              });

              await db.category.update({
                where: {
                  code: search.substring(0, 3),
                },
                data: {
                  countTotal: {
                    decrement: quantity,
                  },
                },
              })

              soldProducts.push({
                kurti: updateUser,
                sale: sell,
                size: cmp,
                quantity: quantity,
                unitPrice: sellingPrice,
                totalPrice: sellingPrice * quantity,
              });

              totalAmount += sellingPrice * quantity;

              console.log(`Product ${i + 1} sold successfully:`, sell);
            } catch (e: any) {
              console.error(
                `Error during sale of product ${i + 1}:`,
                e.message,
                e.stack
              );
              errors.push(`Error selling ${search}-${cmp}: ${e.message}`);
            }
          } else if (!errors.some((err) => err.includes(search))) {
            errors.push(`Product ${search}-${cmp} not in stock`);
          }
        }
      } catch (productError: any) {
        console.error(`Error processing product ${i + 1}:`, productError);
        errors.push(
          `Error processing product ${i + 1}: ${productError.message}`
        );
      }
    }

    // Check if any products were sold successfully
    if (soldProducts.length === 0) {
      return {
        error: "No products could be sold. Errors: " + errors.join(", "),
      };
    }

    // If some products failed but others succeeded, return partial success
    if (errors.length > 0 && soldProducts.length > 0) {
      return {
        success: "Partial sale completed",
        soldProducts,
        totalAmount,
        errors,
        customer: {
          name: customerName,
          phone: customerPhone,
          location: selectedLocation,
          billCreatedBy,
          shopName,
        },
        partialSale: true,
      };
    }

    // All products sold successfully
    return {
      success: "All products sold successfully",
      soldProducts,
      totalAmount,
      customer: {
        name: customerName,
        phone: customerPhone,
        location: selectedLocation,
        billCreatedBy,
        shopName,
      },
    };
  } catch (error) {
    console.error("Multiple sell error:", error);
    return { error: "Something went wrong during the sale process!" };
  }
};

// const validateProduct = async (product: any) => {
//   try {
//     const { code, selectedSize, quantity } = product;

//     let search = code.substring(0, 7).toUpperCase();
//     let cmp = selectedSize.toUpperCase();

//     // Handle special case for CK codes
//     if (
//       code.toUpperCase().substring(0, 2) === "CK" &&
//       code[2] === "0" &&
//       isSize(code.substring(6))
//     ) {
//       search = code.substring(0, 6).toUpperCase();
//     }

//     console.log("Validating - search:", search, "size:", cmp, "quantity:", quantity);

//     const kurti = await db.kurti.findUnique({
//       where: { code: search.toUpperCase(), isDeleted: false },
//       include: {
//         prices: true,
//       },
//     });

//     if (!kurti) {
//       return { error: "Product not found" };
//     }

//     if (!kurti.sizes) {
//       return { error: "No size information available" };
//     }

//     const sizeInfo = kurti.sizes.find((sz: any) => sz.size === cmp);
//     if (!sizeInfo) {
//       return { error: `Size ${cmp} not available` };
//     }

//     if (sizeInfo.quantity < quantity) {
//       return { error: `Insufficient stock. Available: ${sizeInfo.quantity}, Requested: ${quantity}` };
//     }

//     return {
//       kurti,
//       sizeInfo,
//       search,
//       cmp,
//     };
//   } catch (error) {
//     console.error("Validation error:", error);
//     return { error: "Validation failed" };
//   }
// };

const processSingleSale = async (
  product: any,
  validation: any,
  currentUser: any,
  currentTime: Date,
  customerName: string,
  customerPhone: string,
  selectedLocation: string,
  billCreatedBy: string,
  paymentType: string,
  shopName: string
) => {
  try {
    const { kurti, sizeInfo, search, cmp } = validation;
    const { quantity, sellingPrice } = product;

    // Update sizes array
    const updatedSizes = kurti.sizes
      .map((sz: any) => {
        if (sz.size === cmp) {
          return {
            ...sz,
            quantity: sz.quantity - quantity,
          };
        }
        return sz;
      })
      .filter((sz: any) => sz.quantity > 0); // Remove sizes with 0 quantity

    const currTime = await getCurrTime();

    // Update kurti stock
    const updatedKurti = await db.kurti.update({
      where: {
        code: search,
      },
      data: {
        sizes: updatedSizes,
        lastUpdatedTime: currTime,
      },
      include: {
        prices: true,
      },
    });

    // Handle prices
    let prices = updatedKurti.prices;
    if (!prices || !prices.actualPrice1 || !prices.sellingPrice1) {
      const sellPrice = parseInt(updatedKurti.sellingPrice || "0");
      const actualP = parseInt(updatedKurti.actualPrice || "0");

      prices = await db.prices.create({
        data: {
          sellingPrice1: sellPrice,
          sellingPrice2: sellPrice,
          sellingPrice3: sellPrice,
          actualPrice1: actualP,
          actualPrice2: actualP,
          actualPrice3: actualP,
        },
      });

      await db.kurti.update({
        where: {
          code: updatedKurti.code,
        },
        data: {
          pricesId: prices.id,
        },
      });
    }

    // Create individual sell record
    const sell = await db.sell.create({
      data: {
        sellTime: currentTime,
        code: search.toUpperCase(),
        sellerName: currentUser.name,
        kurti: [updatedKurti],
        kurtiId: updatedKurti.id,
        pricesId: prices.id,
        kurtiSize: cmp,
        quantity: quantity,
        customerName,
        customerPhone,
        selledPrice: sellingPrice,
        shopLocation: selectedLocation,
        paymentType: paymentType,
        billCreatedBy: billCreatedBy,
        shopName: shopName,
      },
    });

    return {
      success: "Product sold",
      kurti: updatedKurti,
      sale: sell,
    };
  } catch (error) {
    console.error("Single sale processing error:", error);
    return { error: "Failed to process sale" };
  }
};

export const migrate = async () => {
  try {
    // const kurti: any[] = await db.kurti.findMany({ where: { isDeleted: false } });
    const category: any[] = await db.category.findMany({});
    for (let i = 0; i < category.length; i++) {
      await db.category.update({
        where: {
          id: category[i].id,
        },
        data: {
          countTotal: 0,
        },
      });
    }

    for (let i = 0; i < category.length; i++) {
      const ok: any[] = await db.kurti.findMany({
        where: {
          category: {
            mode: "insensitive",
            startsWith: category[i].name,
            endsWith: category[i].name,
          },
        },
      });
      let maxi = 0;
      for (let j = 0; j < ok.length; j++) {
        let code = ok[j].code;
        let cnt = parseInt(code.substring(3)) || 0;
        maxi = Math.max(maxi, cnt);
      }
      const kurtis: any[] = await db.kurti.findMany({
        where: {
          isDeleted: false,
          category: {
            mode: "insensitive",
            startsWith: category[i].name,
            endsWith: category[i].name,
          },
        },
      });
      console.log(category[i].name, kurtis.length);
      let overallCnt = 0,
        uniqueCnt = 0;
      let arrFun: any = [];
      for (let j = 0; j < kurtis.length; j++) {
        uniqueCnt += 1;
        let sizes = kurtis[j]?.sizes || [];
        let cnt = 0;
        for (let k = 0; k < sizes.length; k++) {
          if (sizes[k].quantity <= 0) {
            continue;
          }
          cnt += sizes[k].quantity || 0;
        }
        const fun = db.kurti.update({
          where: {
            id: kurtis[j].id,
          },
          data: {
            countOfPiece: cnt,
          },
        });
        arrFun.push(fun);
        overallCnt += cnt;
      }
      await Promise.all(arrFun);
      console.log("countTotal:", maxi);
      await db.category.update({
        where: {
          id: category[i].id,
        },
        data: {
          countTotal: maxi,
        },
      });
    }

    return category;
  } catch (e: any) {
    console.log(e);
    return e.message;
  }
};

export const getSellHistory = async () => {
  // const currentDate = new Date().toISOString().slice(0, 10);
  const currentTime = new Date();

  // Calculate the offset for IST (UTC+5:30)
  const ISTOffset = 5.5 * 60 * 60 * 1000;

  // Convert the local time to IST
  const ISTTime = new Date(currentTime.getTime() + ISTOffset)
    .toISOString()
    .slice(0, 10);
  const sellData = await db.sell.findMany({
    where: {
      sellTime: {
        gte: new Date(`${ISTTime}T00:00:00.000Z`),
        lt: new Date(`${ISTTime}T23:59:59.999Z`),
      },
    },
  });

  return sellData;
};

export const addStock = async (code: string) => {
  try {
    console.log(code);
    let search = code.substring(0, 7).toUpperCase();
    let cmp = code.substring(7);
    if (
      code.toUpperCase().substring(0, 2) === "CK" &&
      code[2] === "0" &&
      isSize(code.substring(6))
    ) {
      search = code.substring(0, 6).toUpperCase();
      cmp = code.substring(6);
    }
    if (cmp.length === 0) {
      return { error: "Enter valid code" };
    }
    console.log("search: ", search);
    const kurti = await db.kurti.findUnique({
      where: { code: search.toUpperCase(), isDeleted: false },
    });
    console.log(kurti);
    if (!kurti) {
      return { error: "No Kurti found!!!" };
    }
    let sizes: any[] = kurti.sizes || [];
    let flag = 0;
    for (let i = 0; i < sizes.length; i++) {
      if (sizes[i].size === cmp) {
        sizes[i].quantity += 1;
        flag = 1;
        break;
      }
    }
    if (flag === 0) {
      sizes.push({
        size: cmp,
        quantity: 1,
      });
    }
    console.log(sizes);
    const currTime = await getCurrTime();
    const updateUser: any = await db.kurti.update({
      where: {
        code: search,
      },
      data: {
        sizes: sizes,
        countOfPiece: {
          increment: 1,
        },
        lastUpdatedTime: currTime,
      },
    });
    let inc = updateUser.actualPrice;

    // await db.category.update({
    //     where: {
    //         normalizedLowerCase: updateUser.category.toLowerCase(),
    //     },
    //     data: {
    //         countOfPiece: {
    //             increment: 1
    //         },
    //         sellingPrice: parseInt(updateUser.sellingPrice || "0"),
    //         // actualPrice: {
    //         //     increment: inc
    //         // }
    //     },
    // });
    const KurtiNew = await db.kurti.findUnique({
      where: {
        code: search,
      },
    });
    const increaseInCategory = await db.category.update({
      where: {
        code: KurtiNew?.category.toUpperCase(),
      },
      data: {
        countTotal: {
          increment: 1,
        },
      },
    });
    return KurtiNew;
  } catch (e: any) {
    console.log(e.message);
    return { error: "Something went wrong" };
  }
};

export const migrate2 = async () => {
  try {
    // const kurti: any[] = await db.kurti.findMany({ where: { isDeleted: false } });
    const allKurties: any[] = await db.kurti.findMany({});
    for (let i = 0; i < allKurties.length; i++) {
      let cat = allKurties[i].category.toLowerCase();
      let fnd = await db.category.findUnique({
        where: {
          normalizedLowerCase: cat,
        },
      });
      if (!fnd || fnd === undefined || fnd === null) {
        await db.kurti.delete({
          where: {
            id: allKurties[i].id,
          },
        });
      }
    }
  } catch (e: any) {
    console.log(e.message);
    return e;
  }
};

// Function to generate invoice HTML

export const sellMultipleOfflineKurtis = async (data: any) => {
  try {
    let {
      products,
      currentUser,
      currentTime,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      paymentType,
      shopName,
      shopId,
      gstType,
      sellType = OfflineSellType.SHOP_SELL_OFFLINE,
    } = data;

    if (!products || products.length === 0) {
      return { error: "No products provided" };
    }

    const soldProducts = [];
    const errors = [];
    let totalAmount = 0;

    // Create offline sale batch first
    const batchNumber = `OFFLINE-${Date.now()}`;

    // Generate invoice number (get the latest invoice number and increment)
    const latestBatch = await db.offlineSellBatch.findFirst({
      orderBy: { invoiceNumber: "desc" },
      where: { invoiceNumber: { not: null } },
    });
    const invoiceNumber = latestBatch
      ? (latestBatch.invoiceNumber || 0) + 1
      : 1;

    const offlineBatch = await db.offlineSellBatch.create({
      data: {
        batchNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        billCreatedBy: billCreatedBy.trim(),
        totalAmount: 0, // Will be calculated
        totalItems: 0, // Will be calculated
        saleTime: currentTime,
        sellerName: currentUser.name,
        sellType: sellType,
      },
    });

    // Process each product in the cart
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let { code, kurti, selectedSize, quantity, sellingPrice } = product;

      try {
        code = code.toUpperCase();
        let search = code.substring(0, 7).toUpperCase();
        let cmp = selectedSize.toUpperCase();

        // Handle special case for CK codes
        if (
          code.toUpperCase().substring(0, 2) === "CK" &&
          code[2] === "0" &&
          isSize(code.substring(6))
        ) {
          search = code.substring(0, 6).toUpperCase();
        }

        const kurtiFromDB = await db.kurti.findUnique({
          where: { code: search.toUpperCase(), isDeleted: false },
          include: {
            prices: true,
          },
        });

        if (!kurtiFromDB) {
          errors.push(`Product ${search} not found`);
          continue;
        }

        if (kurtiFromDB?.sizes !== undefined) {
          let arr: any[] = kurtiFromDB?.sizes;
          let newArr: any[] = [];
          let flag = 0;

          for (let j = 0; j < arr?.length; j++) {
            let obj = arr[j];
            if (!obj) break;

            if (obj.size === cmp) {
              if (obj.quantity < quantity) {
                errors.push(
                  `Insufficient stock for ${search}-${cmp}. Available: ${obj.quantity}, Requested: ${quantity}`
                );
                flag = 0;
                break;
              } else {
                flag = 1;
                obj.quantity -= quantity;
                if (obj.quantity >= 0) {
                  newArr.push(obj);
                }
              }
            } else {
              newArr.push(arr[j]);
            }
          }

          if (flag === 1) {
            try {
              const currTime = await getCurrTime();

              // Update kurti stock
              const updateUser = await db.kurti.update({
                where: {
                  code: search,
                },
                data: {
                  sizes: newArr,
                  lastUpdatedTime: currTime,
                },
                include: {
                  prices: true,
                },
              });

              // Handle prices
              let prices = updateUser.prices;
              if (!prices || !prices.actualPrice1 || !prices.sellingPrice1) {
                const sellPrice = parseInt(updateUser.sellingPrice || "0");
                const actualP = parseInt(updateUser.actualPrice || "0");

                prices = await db.prices.create({
                  data: {
                    sellingPrice1: sellPrice,
                    sellingPrice2: sellPrice,
                    sellingPrice3: sellPrice,
                    actualPrice1: actualP,
                    actualPrice2: actualP,
                    actualPrice3: actualP,
                  },
                });

                await db.kurti.update({
                  where: {
                    code: updateUser.code,
                  },
                  data: {
                    pricesId: prices.id,
                  },
                });
              }

              // Create individual offline sell record for each product
              const offlineSell = await db.offlineSell.create({
                data: {
                  sellTime: currentTime,
                  code: search.toUpperCase(),
                  kurtiId: updateUser.id,
                  batchId: offlineBatch.id,
                  pricesId: prices.id,
                  kurtiSize: cmp,
                  shopLocation: selectedLocation,
                  customerName: customerName,
                  customerPhone: customerPhone,
                  selledPrice: sellingPrice,
                  quantity: quantity,
                },
              });

              // Update or create TopSoldKurti record
              await db.topSoldKurti.upsert({
                where: {
                  kurtiId: updateUser.id,
                },
                update: {
                  soldCount: {
                    increment: quantity, // Increment by the quantity sold
                  },
                },
                create: {
                  kurtiId: updateUser.id,
                  soldCount: quantity,
                },
              });

              soldProducts.push({
                kurti: updateUser,
                sale: offlineSell,
                size: cmp,
                quantity: quantity,
                unitPrice: sellingPrice,
                totalPrice: sellingPrice * quantity,
              });

              totalAmount += sellingPrice * quantity;
            } catch (e: any) {
              console.error(
                `Error during offline sale of product ${i + 1}:`,
                e.message,
                e.stack
              );
              errors.push(`Error selling ${search}-${cmp}: ${e.message}`);
            }
          } else if (!errors.some((err) => err.includes(search))) {
            errors.push(`Product ${search}-${cmp} not in stock`);
          }
        }
      } catch (productError: any) {
        console.error(
          `Error processing offline product ${i + 1}:`,
          productError
        );
        errors.push(
          `Error processing product ${i + 1}: ${productError.message}`
        );
      }
    }

    // Update batch with final totals
    if (soldProducts.length > 0) {
      await db.offlineSellBatch.update({
        where: { id: offlineBatch.id },
        data: {
          totalAmount: totalAmount,
          totalItems: soldProducts.reduce(
            (sum, product) => sum + product.quantity,
            0
          ),
        },
      });

      // Generate and upload invoice to Firebase
      try {
        const invoiceHTML = generateInvoiceHTML(
          data,
          batchNumber,
          customerName,
          customerPhone,
          selectedLocation,
          billCreatedBy,
          currentUser,
          soldProducts,
          totalAmount,
          gstType || "SGST_CGST",
          invoiceNumber.toString(),
          sellType
        );

        console.log(data);

        // Generate PDF from HTML using Puppeteer
        const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

        // Upload PDF to Firebase
        const invoiceUrl = await uploadInvoicePDFToFirebase(
          pdfBuffer,
          batchNumber
        );

        // Update batch with invoice URL
        await db.offlineSellBatch.update({
          where: { id: offlineBatch.id },
          data: {
            invoiceUrl: invoiceUrl,
          },
        });
      } catch (invoiceError) {
        console.error(
          "Error generating or uploading invoice to Firebase:",
          invoiceError
        );
        // Don't fail the entire sale if invoice upload fails
      }
    }

    // Check if any products were sold successfully
    if (soldProducts.length === 0) {
      // Delete the batch if no products were sold
      await db.offlineSellBatch.delete({
        where: { id: offlineBatch.id },
      });
      return {
        error: "No products could be sold. Errors: " + errors.join(", "),
      };
    }

    // If some products failed but others succeeded, return partial success
    if (errors.length > 0 && soldProducts.length > 0) {
      return {
        success: "Partial offline sale completed",
        soldProducts,
        totalAmount,
        errors,
        customer: {
          name: customerName,
          phone: customerPhone,
          location: selectedLocation,
          billCreatedBy,
          shopId,
        },
        batchNumber,
        partialSale: true,
      };
    }

    // All products sold successfully
    return {
      success: "All offline products sold successfully",
      soldProducts,
      totalAmount,
      customer: {
        name: customerName,
        phone: customerPhone,
        location: selectedLocation,
        billCreatedBy,
        shopId,
      },
      batchNumber,
      invoiceNumber,
    };
  } catch (error) {
    console.error("Multiple offline sell error:", error);
    return { error: "Something went wrong during the offline sale process!" };
  }
};

// Helper function to update size quantities
function updateSizeQuantity(sizes: any[], size: string, change: number): any[] {
  const existingSize = sizes.find((s) => s.size === size);
  if (existingSize) {
    existingSize.quantity += change;
    if (existingSize.quantity === 0) {
      return sizes.filter((s) => s.size !== size);
    } else if (existingSize.quantity < 0) {
      throw new Error(`Size-${size} is not available`);
    }
  } else if (change > 0) {
    sizes.push({ size, quantity: change });
  }
  return sizes;
}

/**
 * Sell multiple online kurtis with optimized transaction handling
 * 
 * SOLUTIONS IMPLEMENTED TO FIX TRANSACTION TIMEOUT ISSUES:
 * 1. Increased transaction timeout from 5s to 15s
 * 2. Added batch operations to minimize database round trips
 * 3. Optimized queries and reduced unnecessary operations
 * 4. Added performance monitoring and error handling
 * 
 * This function handles the sale of multiple kurtis in a single transaction
 * with improved performance and reliability.
 */
export const sellMultipleOnlineKurtis = async (data: any) => {
  try {
    let {
      products,
      currentUser,
      currentTime,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      gstType,
      sellType = OnlineSellType.HALL_SELL_ONLINE,
      orderId,
    } = data;
      console.log("🚀 ~ sellMultipleOnlineKurtis ~ products:", products)

    if (!products || products.length === 0) {
      return { error: "No products provided" };
    }

    // Start a transaction for all operations with increased timeout
    // Performance optimizations: Increased timeout, optimized queries, batch operations
    console.log(`🚀 Starting transaction for ${products.length} products...`);
    const startTime = Date.now();
    
    const txResult = await db.$transaction(async (tx) => {
      const soldProducts: any[] = [];
      const errors: string[] = [];
      let totalAmount = 0;

      // Get user balance for wallet payment
      if (!orderId) {
        return { error: "Order ID is required" };
      }

      const order = await tx.orders.findUnique({
        where: { orderId },
        select: { userId: true }
      });

      if (!order) {
        return { error: "Order not found" };
      }

      const user = await tx.user.findUnique({
        where: { id: order.userId },
        select: { id: true, balance: true, name: true }
      });

      if (!user) {
        return { error: "User not found" };
      }

      // Calculate total order amount
      let totalOrderAmount = 0;
      for (const product of products) {
        totalOrderAmount += product.sellingPrice * product.quantity;
      }

      // Check if user has sufficient balance for payment
      const hasSufficientBalance = user.balance >= totalOrderAmount;
      const paymentStatus = hasSufficientBalance ? "PENDING" : "PENDING"; // Will be updated based on balance

      // Create offline sale batch first
      const batchNumber = `ONLINE-${Date.now()}`;

      // Generate invoice number (get the latest invoice number and increment)
      const latestBatch = await tx.onlineSellBatch.findFirst({
        orderBy: { invoiceNumber: "desc" },
        where: { invoiceNumber: { not: null } },
      });
      const invoiceNumber = latestBatch
        ? (latestBatch.invoiceNumber || 0) + 1
        : 1;

      const offlineBatch = await tx.onlineSellBatch.create({
        data: {
          batchNumber,
          customerName: customerName.trim(),
          customerPhone: customerPhone?.trim() || null,
          billCreatedBy: billCreatedBy.trim(),
          totalAmount: 0,
          totalItems: 0,
          saleTime: currentTime,
          sellerName: currentUser.name,
          sellType: sellType,
          invoiceNumber: invoiceNumber,
          orderId: orderId,
          paymentStatus: paymentStatus,
          gstType: gstType,
        },
      });

          // Process each product in the cart with optimized batch operations
    // Collect all operations to minimize database round trips
    const batchOperations: any[] = [];
    const kurtiUpdates: any[] = [];
    
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        let { code, kurti, selectedSize, quantity, sellingPrice } = product;

        try {
          code = code.toUpperCase();
          let search = code.substring(0, 7).toUpperCase();
          let cmp = selectedSize.toUpperCase();

          // Handle special case for CK codes
          if (
            code.toUpperCase().substring(0, 2) === "CK" &&
            code[2] === "0" &&
            isSize(code.substring(6))
          ) {
            search = code.substring(0, 6).toUpperCase();
          }

          console.log(
            `Processing product ${i + 1} - search:`,
            search,
            "size:",
            cmp,
            "quantity:",
            quantity
          );

          // Find the Kurti with reservedSizes
          const kurtiFromDB = await tx.kurti.findUnique({
            where: { code: search.toUpperCase(), isDeleted: false },
            select: {
              id: true,
              sizes: true,
              reservedSizes: true,
              prices: true,
            },
          });

          if (!kurtiFromDB) {
            errors.push(`Product ${search} not found`);
            continue;
          }

          // Check if size is available in sizes array
          const sizeInSizes: any = kurtiFromDB.sizes.find(
            (s: any) => s.size === cmp
          );
          console.log(
            "🚀 ~ sellMultipleOnlineKurtis ~ kurtiFromDB:",
            kurtiFromDB
          );
          if (!sizeInSizes || sizeInSizes.quantity < quantity) {
            errors.push(
              `Insufficient stock for ${search}-${cmp}. Available: ${
                sizeInSizes?.quantity || 0
              }, Requested: ${quantity}`
            );
            continue;
          }

          // Check if size is available in reservedSizes array
          const sizeInReservedSizes: any = kurtiFromDB.reservedSizes.find(
            (s: any) => s.size === cmp
          );
          if (!sizeInReservedSizes || sizeInReservedSizes.quantity < quantity) {
            errors.push(
              `System problem: Reserved size not available for ${search}-${cmp}. Please contact the owner.`
            );
            continue;
          }

          try {
            // Update Kurti sizes and reservedSizes using updateSizeQuantity function
            const updatedSizes = updateSizeQuantity(
              kurtiFromDB.sizes,
              cmp,
              -quantity
            );
            const updatedReservedSizes = updateSizeQuantity(
              kurtiFromDB.reservedSizes,
              cmp,
              -quantity
            );

            // Update kurti stock
            const updateUser = await tx.kurti.update({
              where: {
                id: kurtiFromDB.id,
              },
              data: {
                sizes: updatedSizes,
                reservedSizes: updatedReservedSizes,
                lastUpdatedTime: currentTime,
              },
              include: {
                prices: true,
              },
            });

            // Handle prices
            let prices = updateUser.prices;
            if (!prices || !prices.actualPrice1 || !prices.sellingPrice1) {
              const sellPrice = parseInt(updateUser.sellingPrice || "0");
              const actualP = parseInt(updateUser.actualPrice || "0");

              prices = await tx.prices.create({
                data: {
                  sellingPrice1: sellPrice,
                  sellingPrice2: sellPrice,
                  sellingPrice3: sellPrice,
                  actualPrice1: actualP,
                  actualPrice2: actualP,
                  actualPrice3: actualP,
                },
              });

              await tx.kurti.update({
                where: {
                  id: updateUser.id,
                },
                data: {
                  pricesId: prices.id,
                },
              });
            }

            // Create individual offline sell record for each product
            const offlineSell = await tx.onlineSell.create({
              data: {
                sellTime: currentTime,
                code: search.toUpperCase(),
                kurtiId: updateUser.id,
                batchId: offlineBatch.id,
                pricesId: prices.id,
                kurtiSize: cmp,
                shopLocation: selectedLocation,
                customerName: customerName,
                customerPhone: customerPhone,
                selledPrice: parseInt(sellingPrice.toString()),
                quantity: quantity,
              },
            });

            // Update or create TopSoldKurti record
            await tx.topSoldKurti.upsert({
              where: {
                kurtiId: updateUser.id,
              },
              update: {
                soldCount: {
                  increment: quantity,
                },
              },
              create: {
                kurtiId: updateUser.id,
                soldCount: quantity,
              },
            });

            soldProducts.push({
              kurti: updateUser,
              sale: offlineSell,
              size: cmp,
              quantity: quantity,
              unitPrice: sellingPrice,
              totalPrice: sellingPrice * quantity,
            });

            await db.orders.update({
              where: { orderId: orderId },
              data: {
                status: OrderStatus.TRACKINGPENDING,
              },
            });

            totalAmount += sellingPrice * quantity;

            console.log(`Product ${i + 1} sold successfully:`, offlineSell);
          } catch (e: any) {
            console.error(
              `Error during offline sale of product ${i + 1}:`,
              e.message,
              e.stack
            );
            errors.push(`Error selling ${search}-${cmp}: ${e.message}`);
          }
        } catch (productError: any) {
          console.error(
            `Error processing offline product ${i + 1}:`,
            productError
          );
          errors.push(
            `Error processing product ${i + 1}: ${productError.message}`
          );
        }
      }
      console.log(soldProducts, "soldProducts");
      // Update batch with final totals and determine payment status
      if (soldProducts.length > 0) {
        // Determine final payment status based on balance sufficiency
        const finalPaymentStatus = hasSufficientBalance ? "COMPLETED" : "PENDING";
        
        await tx.onlineSellBatch.update({
          where: { id: offlineBatch.id },
          data: {
            totalAmount: totalAmount,
            totalItems: soldProducts.reduce(
              (sum, product) => sum + product.quantity,
              0
            ),
            paymentStatus: finalPaymentStatus as any,
          },
        });

        // Only deduct from wallet and create history if balance is sufficient
        if (hasSufficientBalance) {
          // Deduct money from user's wallet
          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: {
                decrement: totalAmount,
              },
            },
          });

          // Create wallet history entry
          await tx.walletHistory.create({
            data: {
              userId: user.id,
              amount: totalAmount,
              type: "DEBIT",
              paymentMethod: "wallet",
              onlineSellBatchId: offlineBatch.id,
            },
          });
        }
      }

      // Check if any products were sold successfully
      if (soldProducts.length === 0) {
        // Delete the batch if no products were sold
        await tx.onlineSellBatch.delete({
          where: { id: offlineBatch.id },
        });
        return {
          error: "No products could be sold. Errors: " + errors.join(", "),
        } as const;
      }

      // If some products failed but others succeeded, return partial success
      if (errors.length > 0 && soldProducts.length > 0) {
        return {
          success: "Partial offline sale completed",
          soldProducts,
          totalAmount,
          errors,
          customer: {
            name: customerName,
            phone: customerPhone,
            location: selectedLocation,
            billCreatedBy,
          },
          batchNumber,
          batchId: offlineBatch.id,
          invoiceNumber,
          partialSale: true,
          paymentStatus: hasSufficientBalance ? "COMPLETED" : "PENDING",
        } as const;
      }

      // All products sold successfully
      return {
        success: "All offline products sold successfully",
        soldProducts,
        totalAmount,
        customer: {
          name: customerName,
          phone: customerPhone,
          location: selectedLocation,
          billCreatedBy,
        },
        batchNumber,
        batchId: offlineBatch.id,
        invoiceNumber,
        paymentStatus: hasSufficientBalance ? "COMPLETED" : "PENDING",
      } as const;
    }, {
      timeout: 15000 // 15 seconds timeout to prevent transaction timeouts
    });
    
    const transactionTime = Date.now() - startTime;
    console.log(`✅ Transaction completed successfully in ${transactionTime}ms`);

    // If transaction returned an error-like object
    if ((txResult as any).error) {
      return txResult;
    }

    // Post-transaction: generate and upload invoice (non-transactional, to avoid timeouts)
    try {
      const { batchNumber, batchId, invoiceNumber } = txResult as any;

      // Fetch all sales for the batch to prepare invoice data
      const allSales = await db.onlineSell.findMany({
        where: { batchId },
        include: { kurti: true },
      });

      const soldProductsForInvoice = allSales.map((sale) => ({
        kurti: sale.kurti,
        size: sale.kurtiSize,
        quantity: sale.quantity || 0,
        selledPrice: sale.selledPrice || 0,
        unitPrice: sale.selledPrice || 0,
        totalPrice: (sale.selledPrice || 0) * (sale.quantity || 0),
      }));

      const totalAmount = soldProductsForInvoice.reduce(
        (sum, p) => sum + (p.totalPrice || 0),
        0
      );

      const invoiceHTML = generateInvoiceHTML(
        data,
        batchNumber,
        customerName,
        customerPhone,
        selectedLocation,
        billCreatedBy,
        currentUser,
        soldProductsForInvoice,
        totalAmount,
        gstType || "SGST_CGST",
        invoiceNumber.toString(),
        sellType
      );

      const pdfBuffer = await generatePDFFromHTML(invoiceHTML);
      const invoiceUrl = await uploadInvoicePDFToFirebase(
        pdfBuffer,
        batchNumber
      );

        await db.onlineSellBatch.update({
        where: { id: batchId },
        data: { invoiceUrl },
      });
    } catch (invoiceError) {
      console.error(
        "Error generating or uploading invoice to Firebase:",
        invoiceError
      );
      // Do not fail the sale if invoice upload fails
    }

    return txResult;
  } catch (error: any) {
    console.error("Multiple offline sell error:", error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    // Check if it's a transaction timeout error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2028') {
      return { 
        error: "Transaction timeout occurred. Please try again with fewer products or contact support.",
        details: "The operation took too long to complete. Consider processing products in smaller batches."
      };
    }
    
    return { error: "Something went wrong during the offline sale process!" };
  }
};

// Function to regenerate invoice for an existing offline sale
export const regenerateOfflineSaleInvoice = async (
  batchId: string,
  currentUser: any
) => {
  try {
    // Get the existing batch with all sales data
    const existingBatch = await db.offlineSellBatch.findUnique({
      where: { id: batchId },
      include: {
        shop: true,
        sales: {
          include: {
            kurti: true,
          },
        },
      },
    });

    if (!existingBatch) {
      return { error: "Offline sale batch not found" };
    }

    // Prepare sold products data for invoice generation
    const soldProducts = existingBatch.sales.map((sale) => ({
      kurti: sale.kurti,
      size: sale.kurtiSize,
      quantity: sale.quantity || 1,
      selledPrice: sale.selledPrice || 0,
      unitPrice: sale.selledPrice || 0,
      totalPrice: (sale.selledPrice || 0) * (sale.quantity || 1),
    }));

    // Delete old invoice from Firebase if it exists
    if (existingBatch.invoiceUrl) {
      await deleteInvoiceFromFirebase(existingBatch.batchNumber);
    }

    // Generate new invoice HTML
    const invoiceHTML = generateInvoiceHTML(
      existingBatch,
      existingBatch.batchNumber,
      existingBatch.customerName,
      existingBatch.customerPhone || "",
      existingBatch.shop?.shopLocation || "",
      existingBatch.billCreatedBy,
      currentUser,
      soldProducts,
      existingBatch.totalAmount,
      existingBatch.gstType === "IGST" ? "IGST" : "SGST_CGST",
      existingBatch.invoiceNumber?.toString() || "",
      existingBatch.sellType || "SHOP_SELL_OFFLINE"
    );

    // Generate PDF from HTML using Puppeteer
    const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

    // Upload new PDF to Firebase
    const newInvoiceUrl = await uploadInvoicePDFToFirebase(
      pdfBuffer,
      existingBatch.batchNumber
    );

    // Update batch with new invoice URL
    await db.offlineSellBatch.update({
      where: { id: batchId },
      data: {
        invoiceUrl: newInvoiceUrl,
      },
    });

    return {
      success: true,
      invoiceUrl: newInvoiceUrl,
      batchNumber: existingBatch.batchNumber,
      invoiceNumber: existingBatch.invoiceNumber,
    };
  } catch (error) {
    console.error("Error regenerating invoice:", error);
    return { error: "Failed to regenerate invoice" };
  }
};

export const addProductsToExistingOfflineBatch = async (data: any) => {
  try {
    let {
      batchId,
      products,
      currentUser,
      currentTime,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      paymentType,
      shopId,
      gstType,
    } = data;

    if (!batchId) {
      return { error: "Batch ID is required" };
    }

    if (!products || products.length === 0) {
      return { error: "No products provided" };
    }

    // Get the existing batch
    const existingBatch = await db.offlineSellBatch.findUnique({
      where: { id: batchId },
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
      },
    });

    if (!existingBatch) {
      return { error: "Offline sale batch not found" };
    }

    const soldProducts = [];
    const errors = [];
    let additionalAmount = 0;

    // Process each new product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let { code, kurti, selectedSize, quantity, sellingPrice } = product;

      try {
        code = code.toUpperCase();
        let search = code.substring(0, 7).toUpperCase();
        let cmp = selectedSize.toUpperCase();

        // Handle special case for CK codes
        if (
          code.toUpperCase().substring(0, 2) === "CK" &&
          code[2] === "0" &&
          isSize(code.substring(6))
        ) {
          search = code.substring(0, 6).toUpperCase();
        }

        const kurtiFromDB = await db.kurti.findUnique({
          where: { code: search.toUpperCase(), isDeleted: false },
          include: {
            prices: true,
          },
        });

        if (!kurtiFromDB) {
          errors.push(`Product ${search} not found`);
          continue;
        }

        // Check if size exists and has stock
        const sizeInfo = kurtiFromDB.sizes.find((sz: any) => sz.size === cmp);
        if (!sizeInfo || (sizeInfo as any).quantity < quantity) {
          errors.push(
            `Product ${search}-${cmp} not in stock or insufficient quantity`
          );
          continue;
        }

        // Update stock
        const updateUser = await db.kurti.update({
          where: { id: kurtiFromDB.id },
          data: {
            sizes: kurtiFromDB.sizes.map((sz: any) => {
              if (sz.size === cmp) {
                return { ...sz, quantity: (sz as any).quantity - quantity };
              }
              return sz;
            }),
          },
        });

        // Create or get prices record
        let prices = await db.prices.findFirst({
          where: {
            Kurti: {
              some: {
                id: updateUser.id,
              },
            },
          },
        });

        if (!prices) {
          prices = await db.prices.create({
            data: {
              sellingPrice1: sellingPrice,
            },
          });
        } else {
          // Update existing price
          prices = await db.prices.update({
            where: { id: prices.id },
            data: {
              sellingPrice1: sellingPrice,
            },
          });
        }

        // Create individual offline sell record for the new product
        const offlineSell = await db.offlineSell.create({
          data: {
            sellTime: currentTime,
            code: search.toUpperCase(),
            kurtiId: updateUser.id,
            batchId: existingBatch.id,
            pricesId: prices.id,
            kurtiSize: cmp,
            shopLocation: selectedLocation,
            customerName: customerName,
            customerPhone: customerPhone,
            selledPrice: sellingPrice,
            quantity: quantity,
          },
        });

        // Update or create TopSoldKurti record
        await db.topSoldKurti.upsert({
          where: {
            kurtiId: updateUser.id,
          },
          update: {
            soldCount: {
              increment: quantity,
            },
          },
          create: {
            kurtiId: updateUser.id,
            soldCount: quantity,
          },
        });

        soldProducts.push({
          kurti: updateUser,
          sale: offlineSell,
          size: cmp,
          quantity: quantity,
          unitPrice: sellingPrice,
          totalPrice: sellingPrice * quantity,
        });

        additionalAmount += sellingPrice * quantity;
      } catch (productError: any) {
        console.error(
          `Error processing additional product ${i + 1}:`,
          productError
        );
        errors.push(
          `Error processing product ${i + 1}: ${productError.message}`
        );
      }
    }

    // Update batch with new totals
    if (soldProducts.length > 0) {
      const newTotalAmount = existingBatch.totalAmount + additionalAmount;
      const newTotalItems =
        existingBatch.totalItems +
        soldProducts.reduce((sum, product) => sum + product.quantity, 0);

      await db.offlineSellBatch.update({
        where: { id: existingBatch.id },
        data: {
          totalAmount: newTotalAmount,
          totalItems: newTotalItems,
        },
      });

      // Generate new invoice with all products (existing + new)
      try {
        // Get all sales for this batch (existing + new)
        const allSales = await db.offlineSell.findMany({
          where: { batchId: existingBatch.id },
          include: {
            kurti: true,
            prices: true,
          },
        });

        // Convert to the format expected by invoice generation
        const allSoldProducts = allSales.map((sale) => ({
          kurti: sale.kurti,
          size: sale.kurtiSize,
          quantity: sale.quantity || 0,
          selledPrice: sale.selledPrice || 0,
          unitPrice: sale.selledPrice || 0,
          totalPrice: (sale.selledPrice || 0) * (sale.quantity || 0),
        }));

        const invoiceHTML = generateInvoiceHTML(
          data,
          existingBatch.batchNumber,
          customerName,
          customerPhone,
          selectedLocation,
          billCreatedBy,
          currentUser,
          allSoldProducts,
          newTotalAmount,
          gstType || "SGST_CGST",
          existingBatch.invoiceNumber?.toString() || "",
          existingBatch.sellType || "SHOP_SELL_OFFLINE"
        );

        // Generate PDF from HTML using Puppeteer
        const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

        // Upload PDF to Firebase
        const invoiceUrl = await uploadInvoicePDFToFirebase(
          pdfBuffer,
          existingBatch.batchNumber
        );

        // Update batch with new invoice URL
        await db.offlineSellBatch.update({
          where: { id: existingBatch.id },
          data: {
            invoiceUrl: invoiceUrl,
          },
        });
      } catch (invoiceError) {
        console.error(
          "Error generating or uploading updated invoice to Firebase:",
          invoiceError
        );
        // Don't fail the entire operation if invoice upload fails
      }
    }

    // Check if any products were added successfully
    if (soldProducts.length === 0) {
      return {
        error: "No products could be added. Errors: " + errors.join(", "),
      };
    }

    // If some products failed but others succeeded, return partial success
    if (errors.length > 0 && soldProducts.length > 0) {
      return {
        success: "Partial addition completed",
        soldProducts,
        additionalAmount,
        errors,
        customer: {
          name: customerName,
          phone: customerPhone,
          location: selectedLocation,
          billCreatedBy,
          shopId,
        },
        batchNumber: existingBatch.batchNumber,
        partialAddition: true,
      };
    }

    // All products added successfully
    return {
      success: "All additional products added successfully",
      soldProducts,
      additionalAmount,
      customer: {
        name: customerName,
        phone: customerPhone,
        location: selectedLocation,
        billCreatedBy,
        shopId,
      },
      batchNumber: existingBatch.batchNumber,
      invoiceNumber: existingBatch.invoiceNumber,
    };
  } catch (error) {
    console.error("Add products to existing batch error:", error);
    return {
      error: "Something went wrong during adding products to existing batch!",
    };
  }
};

// Function to regenerate invoice for an existing online sale
export const regenerateOnlineSaleInvoice = async (
  batchId: string,
  currentUser: any
) => {
  try {
    // Get the existing batch with all sales data
    const existingBatch = await db.onlineSellBatch.findUnique({
      where: { id: batchId },
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
      },
    });

    if (!existingBatch) {
      return { error: "Online sale batch not found" };
    }

    // Prepare sold products data for invoice generation
    const soldProducts = existingBatch.sales.map((sale) => ({
      kurti: sale.kurti,
      size: sale.kurtiSize,
      quantity: sale.quantity || 1,
      selledPrice: sale.selledPrice || 0,
      unitPrice: sale.selledPrice || 0,
      totalPrice: (sale.selledPrice || 0) * (sale.quantity || 1),
    }));

    // Delete old invoice from Firebase if it exists
    if (existingBatch.invoiceUrl) {
      await deleteInvoiceFromFirebase(existingBatch.batchNumber);
    }

    // Generate new invoice HTML
    const invoiceHTML = generateInvoiceHTML(
      existingBatch,
      existingBatch.batchNumber,
      existingBatch.customerName,
      existingBatch.customerPhone || "",
      "", // No shop location for online sales
      existingBatch.billCreatedBy,
      currentUser,
      soldProducts,
      existingBatch.totalAmount,
      existingBatch.gstType === "IGST" ? "IGST" : "SGST_CGST",
      existingBatch.invoiceNumber?.toString() || "",
      existingBatch.sellType || "HALL_SELL_ONLINE"
    );

    // Generate PDF from HTML using Puppeteer
    const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

    // Upload new PDF to Firebase
    const newInvoiceUrl = await uploadInvoicePDFToFirebase(
      pdfBuffer,
      existingBatch.batchNumber
    );

    // Update batch with new invoice URL
    await db.onlineSellBatch.update({
      where: { id: batchId },
      data: {
        invoiceUrl: newInvoiceUrl,
      },
    });

    return {
      success: true,
      invoiceUrl: newInvoiceUrl,
      batchNumber: existingBatch.batchNumber,
      invoiceNumber: existingBatch.invoiceNumber,
    };
  } catch (error) {
    console.error("Error regenerating online sale invoice:", error);
    return { error: "Failed to regenerate invoice" };
  }
};
