import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { PlaceholderImage } from "./PageElements"

const REFRESH_MARGIN_MS = 10_000
const MAX_TIMEOUT_MS = 2_147_483_647

export function getPresignedImageRefreshDelay(
  expiresAtValues: Array<string | null | undefined>,
  now = Date.now(),
) {
  const expirationTimes = expiresAtValues
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter(Number.isFinite)

  if (expirationTimes.length === 0) return null
  return Math.min(
    MAX_TIMEOUT_MS,
    Math.max(0, Math.min(...expirationTimes) - now - REFRESH_MARGIN_MS),
  )
}

export function usePresignedImageRefresh(
  expiresAtValues: Array<string | null | undefined>,
  onRefresh: () => void,
) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const expirationKey = expiresAtValues.join("|")

  useEffect(() => {
    const delay = getPresignedImageRefreshDelay(expiresAtValues)
    if (delay === null) return

    const timeoutId = window.setTimeout(() => onRefreshRef.current(), delay)
    return () => window.clearTimeout(timeoutId)
  }, [expirationKey]) // eslint-disable-line react-hooks/exhaustive-deps
}

interface PresignedImageProps {
  src: string | null
  expiresAt: string | null
  alt: string
  onRefresh: (failedUrl?: string) => void
  className?: string
  style?: CSSProperties
  fallback?: ReactNode
  fallbackTall?: boolean
}

export default function PresignedImage({
  src,
  alt,
  onRefresh,
  className,
  style,
  fallback,
  fallbackTall = false,
}: PresignedImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const refreshRequestedUrls = useRef(new Set<string>())
  const isUnavailable = !src || failedUrl === src

  if (isUnavailable) {
    return <>{fallback ?? <PlaceholderImage tall={fallbackTall} />}</>
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        setFailedUrl(src)
        if (!refreshRequestedUrls.current.has(src)) {
          refreshRequestedUrls.current.add(src)
          onRefresh(src)
        }
      }}
    />
  )
}
