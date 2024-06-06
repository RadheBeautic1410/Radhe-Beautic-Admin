"use client";

import { Card, CardContent, CardHeader } from '@/src/components/ui/card'
import React from 'react'

function NotAllowedPage() {
  return (
    <Card className='w-[90%]'>
      <CardHeader>
        <p className="text-2xl font-semibold text-center">
        ⚠️ Error
        </p>
      </CardHeader>
      <CardContent>
        <h1 className='text-xl font-semibold text-center'>
          You are not allowed to see requested the page, contact ADMIN to give you the access to this page
        </h1>
      </CardContent>
    </Card>
  )
}

export default NotAllowedPage