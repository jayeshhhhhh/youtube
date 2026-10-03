import * as React from "react"
import * as Slot from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof Slot.Root>,
  React.ComponentPropsWithoutRef<typeof Slot.Root>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative overflow-hidden",
      className
    )}
    {...props}
  >
    <Slot.Root className="h-full w-full">
      <Slot.Viewport className="h-full w-full rounded-md">
        {children}
      </Slot.Viewport>
      <Slot.Scrollbar orientation="vertical">
        <Slot.Thumb className="bg-border" />
      </Slot.Scrollbar>
      <Slot.Scrollbar orientation="horizontal">
        <Slot.Thumb className="bg-border" />
      </Slot.Scrollbar>
    </Slot.Root>
  </div>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
