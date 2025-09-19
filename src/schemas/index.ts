import { UserRole } from "@prisma/client";
import * as z from "zod";

export const RequestSchema = z.object({
  role: z.enum([
    UserRole.ADMIN,
    UserRole.USER,
    UserRole.MOD,
    UserRole.REFERRER,
  ]),
});

export const ModeratorUpdateSchema = z.object({
  isVerified: z.boolean(),
  role: z.enum([UserRole.ADMIN, UserRole.SELLER]),
});

export const partyAddSchema = z.object({
  name: z.string().min(1, {
    message: "Party is required",
  }),
});

export const categoryAddSchema = z.object({
  name: z.string().min(1, {
    message: "Category is required",
  }),
  type: z.string().min(1, {
    message: "Type is required",
  }),
  image: z.optional(
    z.string().url({
      message: "Image must be a valid URL",
    })
  ),
  price: z.optional(
    z.number().min(1, {
      message: "Price must be a number greater than 0",
    })
  ),
  actualPrice: z.optional(
    z.number().min(1, {
      message: "Big price must be a number greater than 0",
    })
  ),
  sellingPrice: z.optional(
    z.number().min(1, {
      message: "Big price must be a number greater than 0",
    })
  ),
  bigPrice: z.optional(
    z.number().min(1, {
      message: "Big price must be a number greater than 0",
    })
  ),
});

export const stockUpdateSchema = z.object({
  sizes: z.array(
    z.object({
      size: z.string(),
      quantity: z.number(),
    })
  ),
});

export const SettingSchema = z
  .object({
    password: z.optional(z.string().min(6)),
    newPassword: z.optional(z.string().min(6)),
    qrCode: z.any().optional(), // Add this line to include qrCode
  })
  .refine(
    (data) => {
      if (data.password && !data.newPassword) {
        return false;
      }
      return true;
    },
    {
      message: "New password is required!",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      if (data.newPassword && !data.password) {
        return false;
      }
      return true;
    },
    {
      message: "Password is required!",
      path: ["password"],
    }
  );

export const LoginSchema = z.object({
  phoneNumber: z.string().length(10, {
    message: "Phone Number is required",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
  code: z.optional(z.string()),
});

export const RegisterSchema = z.object({
  phoneNumber: z.string().length(10, {
    message: "Email is required",
  }),
  password: z.string().min(6, {
    message: "Minimum 6 characters required",
  }),
  name: z.string().min(1, {
    message: "Name is required",
  }),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.SELLER,
    UserRole.UPLOADER,
    UserRole.RESELLER,
  ]),
});

export const ResetSchema = z.object({
  phoneNumber: z.string().length(10, {
    message: "Email is required",
  }),
});

export const NewPasswordSchema = z.object({
  password: z.string().min(6, {
    message: "Minimum 6 characters required",
  }),
});

export const KurtiSchema = z.object({
  images: z.array(
    z.object({ url: z.string(), id: z.string(), is_hidden: z.boolean() })
  ),
  videos: z
    .array(
      z.object({ url: z.string(), id: z.string(), is_hidden: z.boolean() })
    )
    .optional(),
  sizes: z.array(
    z.object({
      size: z.string(),
      quantity: z.number(),
    })
  ),
  party: z.string().min(1, { message: "Please select the party." }),
  sellingPrice: z.string().refine(
    (val) => {
      const numericValue = parseFloat(val);
      return !Number.isNaN(numericValue) && numericValue > 0;
    },
    {
      message: "Sell price must be a number greater than 0",
    }
  ),
  actualPrice: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // Actual price is optional, so if it's not provided, validation passes
        const numericValue = parseFloat(val);
        return (
          !Number.isNaN(numericValue) && numericValue > 0 && numericValue > 0
        );
      },
      {
        message:
          "Actual price must be a number greater than 0 and less than or equal to sell price",
      }
    ),
  countOfPiece: z.number(),
  category: z.string().min(1, { message: "Please select the category." }),
  code: z.string(),
});

export const categoryEditSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  image: z.string().optional(),
  bigPrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  actualPrice: z.number().optional(),
  walletDiscount: z.number().min(0, "Discount must be zero or more").optional(),
});
