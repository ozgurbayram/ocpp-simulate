import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const textVariants = cva(
  "inline-block",
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        primary: "text-primary",
        secondary: "text-secondary-foreground",
        destructive: "text-destructive",
        success: "text-green-600 dark:text-green-400",
        warning: "text-yellow-600 dark:text-yellow-400",
      },
      size: {
        xs: "text-xs leading-4",
        sm: "text-sm leading-5",
        base: "text-sm md:text-base leading-5 md:leading-6",
        lg: "text-base md:text-lg leading-6 md:leading-7",
        xl: "text-lg md:text-xl leading-7 md:leading-8",
        "2xl": "text-xl md:text-2xl leading-8 md:leading-9",
        "3xl": "text-2xl md:text-3xl leading-9 md:leading-10",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
        justify: "text-justify",
      },
      responsive: {
        true: "break-words hyphens-auto",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "base",
      weight: "normal",
      align: "left",
      responsive: true,
    },
  }
)

function BaseText({
  className,
  variant,
  size,
  weight,
  align,
  responsive,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof textVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="text"
      className={cn(textVariants({ variant, size, weight, align, responsive }), className)}
      {...props}
    />
  )
}

export { BaseText, textVariants }
