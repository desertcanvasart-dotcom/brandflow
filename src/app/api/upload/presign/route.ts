import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPresignedUploadUrl } from '@/lib/r2/presign'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileName, contentType, folder } = await request.json()

  if (!fileName || !contentType) {
    return NextResponse.json(
      { error: 'fileName and contentType are required' },
      { status: 400 }
    )
  }

  const result = await createPresignedUploadUrl(fileName, contentType, folder)

  return NextResponse.json(result)
}
