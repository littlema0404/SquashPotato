/** LINE 內建瀏覽器（LIFF）的 User-Agent 通常包含 Line/ */
export function isLineInAppBrowser(userAgent: string | null): boolean {
  if (!userAgent) return false
  return /Line\//i.test(userAgent)
}
