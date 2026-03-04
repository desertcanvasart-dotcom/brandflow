import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

const livekitHost = process.env.LIVEKIT_URL ?? ''
const apiKey = process.env.LIVEKIT_API_KEY ?? ''
const apiSecret = process.env.LIVEKIT_API_SECRET ?? ''

export const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

export async function createLiveKitToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  canPublish = true
): Promise<string> {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
  })

  return await token.toJwt()
}
