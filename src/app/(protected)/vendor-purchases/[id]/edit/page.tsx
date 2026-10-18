"use client"

import { useParams } from "next/navigation"
import { PurchaseForm } from "../../_components/purchase-form"

export default function EditVendorPurchasePage() {
  const { id } = useParams<{ id: string }>()
  return <PurchaseForm purchaseId={id} />
}
