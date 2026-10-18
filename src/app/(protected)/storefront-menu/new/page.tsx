import { MenuItemForm } from "../_components/menu-item-form"

export default async function NewMenuItemPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const { parent } = await searchParams
  return <MenuItemForm defaultParentId={parent} />
}
