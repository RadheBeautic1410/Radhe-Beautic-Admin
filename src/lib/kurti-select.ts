import { Prisma } from "@prisma/client";

/**
 * Every Kurti scalar except the image-search embedding (imageVector and its
 * version tag). Use it for list/catalogue reads that would otherwise return the
 * whole document: the embedding is only written on upload and searched through
 * the Atlas vector index, never read back by the UI.
 */
export const KURTI_LIST_SELECT = {
  id: true,
  pricesId: true,
  sizes: true,
  reservedSizes: true,
  party: true,
  sellingPrice: true,
  actualPrice: true,
  customerPrice: true,
  category: true,
  code: true,
  images: true,
  isDeleted: true,
  countOfPiece: true,
  lastUpdatedTime: true,
  videos: true,
  bigPrice: true,
  weight: true,
  name: true,
  description: true,
  fabric: true,
  fitShape: true,
  length: true,
  neck: true,
  occasion: true,
  pattern: true,
  sleeve: true,
  stitchType: true,
  color: true,
  parentCode: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.KurtiSelect;
