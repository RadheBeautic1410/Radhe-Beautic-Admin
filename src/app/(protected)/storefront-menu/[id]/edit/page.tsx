"use client"

import { useParams } from "next/navigation"
import { MenuItemForm } from "../../_components/menu-item-form"

export default function EditMenuItemPage() {
  const { id } = useParams<{ id: string }>()
  return <MenuItemForm itemId={id} />
}
