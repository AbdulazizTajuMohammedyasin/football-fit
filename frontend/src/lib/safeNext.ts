/** Only allow post-sign-in redirects back into this app, never to another site. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/shortlists'
  }
  return value
}
