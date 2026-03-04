const FIGMA_API_BASE = 'https://api.figma.com/v1'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FigmaUser {
  id: string
  handle: string
  email: string
  img_url: string
}

export interface FigmaTeam {
  id: string
  name: string
}

export interface FigmaProject {
  id: number
  name: string
}

export interface FigmaFile {
  key: string
  name: string
  thumbnail_url: string
  last_modified: string
}

export interface FigmaFileDetail {
  name: string
  lastModified: string
  thumbnailUrl: string
  version: string
  document: {
    id: string
    name: string
    type: string
    children: FigmaNode[]
  }
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function figmaGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${FIGMA_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ err: res.statusText }))
    throw new Error(error.err ?? error.message ?? `Figma API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function figmaPost<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`${FIGMA_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ err: res.statusText }))
    throw new Error(error.err ?? error.message ?? `Figma API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getMe(accessToken: string): Promise<FigmaUser> {
  return figmaGet<FigmaUser>('/me', accessToken)
}

export async function getTeamProjects(
  teamId: string,
  accessToken: string,
): Promise<FigmaProject[]> {
  const res = await figmaGet<{ projects: FigmaProject[] }>(
    `/teams/${teamId}/projects`,
    accessToken,
  )
  return res.projects
}

export async function getProjectFiles(
  projectId: number,
  accessToken: string,
): Promise<FigmaFile[]> {
  const res = await figmaGet<{ files: FigmaFile[] }>(
    `/projects/${projectId}/files`,
    accessToken,
  )
  return res.files
}

export async function getFile(
  fileKey: string,
  accessToken: string,
): Promise<FigmaFileDetail> {
  return figmaGet<FigmaFileDetail>(`/files/${fileKey}?depth=1`, accessToken)
}

export async function getFileNodes(
  fileKey: string,
  nodeIds: string[],
  accessToken: string,
): Promise<{ nodes: Record<string, { document: FigmaNode }> }> {
  const ids = nodeIds.join(',')
  return figmaGet<{ nodes: Record<string, { document: FigmaNode }> }>(
    `/files/${fileKey}/nodes?ids=${ids}`,
    accessToken,
  )
}

export async function exportImages(
  fileKey: string,
  nodeIds: string[],
  accessToken: string,
  format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png',
  scale: number = 2,
): Promise<Record<string, string>> {
  const ids = nodeIds.join(',')
  const res = await figmaGet<{ images: Record<string, string> }>(
    `/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`,
    accessToken,
  )
  return res.images
}
