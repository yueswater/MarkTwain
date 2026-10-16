import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      // A name, a title or a setting is not prose, so no word of it is marked as a mistake, the editor has its own switch
      spellCheck={false}
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-0 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 ",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
