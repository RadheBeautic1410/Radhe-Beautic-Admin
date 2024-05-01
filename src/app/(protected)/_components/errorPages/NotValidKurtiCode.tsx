import { Card, CardContent, CardHeader } from '@/src/components/ui/card'
import React from 'react'

function NotValidKurtiCode() {
  return (
    <Card className='w-[90%]'>
      <CardHeader>
        <p className="text-2xl font-semibold text-center">
        ⚠️ Error
        </p>
      </CardHeader>
      <CardContent>
        <h1 className='text-xl font-semibold text-center'>
          The URL contains wrong kurti code
        </h1>
      </CardContent>
    </Card>
  )
}

export default NotValidKurtiCode