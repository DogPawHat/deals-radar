import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive border-2 border-foreground bg-clip-padding text-sm font-extrabold uppercase tracking-[0.16em] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap outline-none group/button select-none neo-shadow active:translate-x-1 active:translate-y-1 active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:translate-x-0.5 hover:translate-y-0.5 hover:[box-shadow:2px_2px_0_#1A1A1A]",
        destructive:
          "bg-destructive text-destructive-foreground hover:translate-x-0.5 hover:translate-y-0.5 hover:[box-shadow:2px_2px_0_#1A1A1A]",
        outline:
          "bg-background text-foreground hover:bg-secondary hover:translate-x-0.5 hover:translate-y-0.5 hover:[box-shadow:2px_2px_0_#1A1A1A]",
        secondary:
          "bg-green-gain text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:[box-shadow:2px_2px_0_#1A1A1A]",
        ghost: "border-transparent bg-transparent shadow-none hover:bg-secondary/70",
        link: "border-transparent bg-transparent p-0 font-bold tracking-[0.16em] text-green-gain shadow-none hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[11px]",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-xs": "size-6",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
