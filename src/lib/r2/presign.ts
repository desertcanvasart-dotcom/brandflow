import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client } from './client'
import { nanoid } from 'nanoid'

export async function createPresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
) {
  const ext = fileName.split('.').pop()
  const key = `${folder}/${nanoid()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return { uploadUrl, publicUrl, key }
}
