import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"

/** The toasts of the app, like those of AnvilNote: top right, closable, gone after three seconds. */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    position="top-right"
    closeButton
    duration={3000}
    gap={12}
    offset={{ top: "64px", right: "16px" }}
    icons={{
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
      error: <OctagonXIcon className="size-4" />,
    }}
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
      } as React.CSSProperties
    }
    {...props}
  />
)

export { Toaster }
