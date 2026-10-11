"use client"

import { useParams } from "next/navigation"
import { ReelForm } from "../../_components/reel-form"

export default function EditReelPage() {
  const { id } = useParams<{ id: string }>()
  return <ReelForm reelId={id} />
}
