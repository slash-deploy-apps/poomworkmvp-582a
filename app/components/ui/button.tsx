import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[20px] border-0 bg-clip-padding text-sm font-bold tracking-wide whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-4 focus-visible:ring-[#7C3AED]/30 focus-visible:ring-offset-2 active:scale-[0.92] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-button hover:-translate-y-1 hover:shadow-clay-button-hover active:shadow-clay-pressed",
        outline:
          "border-2 border-[#7C3AED]/20 bg-transparent text-[#7C3AED] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 active:shadow-clay-pressed",
        secondary:
          "bg-white text-[#332F3A] shadow-clay-button hover:-translate-y-1 hover:shadow-clay-button-hover active:shadow-clay-pressed",
        ghost:
          "text-[#332F3A] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED]",
        destructive:
          "bg-gradient-to-br from-[#FCA5A5] to-[#EF4444] text-white shadow-clay-button hover:-translate-y-1 hover:shadow-clay-button-hover active:shadow-clay-pressed",
        link: "text-[#7C3AED] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 gap-2 px-6 text-sm",
        xs: "h-9 gap-1 px-3 text-xs rounded-[16px]",
        sm: "h-11 gap-1.5 px-4 text-sm",
        lg: "h-16 gap-2 px-8 text-base",
        icon: "size-14 rounded-[20px]",
        "icon-xs": "size-9 rounded-[16px]",
        "icon-sm": "size-11 rounded-[20px]",
        "icon-lg": "size-16 rounded-[20px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
