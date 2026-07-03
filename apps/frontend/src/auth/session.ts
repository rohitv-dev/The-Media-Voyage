import { authClient } from './authClient'

export async function getSession() {
  const { data, error } = await authClient.getSession()

  if (error) return null

  return data
}
