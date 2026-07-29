import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.01em] transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border border-primary-border shadow-elevation-1 hover:bg-primary/90 hover:shadow-elevation-2 active:scale-[0.99]',
        destructive:
          'bg-destructive text-destructive-foreground border border-destructive-border shadow-elevation-1 hover:bg-destructive/90 hover:shadow-elevation-2 active:scale-[0.99]',
        outline:
          'border border-border bg-card text-foreground shadow-elevation-1 hover:bg-accent hover:text-accent-foreground hover:border-border/70 hover:shadow-elevation-2 active:scale-[0.99]',
        secondary:
          'border border-secondary-border bg-secondary text-secondary-foreground hover:bg-secondary/75 hover:shadow-elevation-1 active:scale-[0.99]',
        ghost:
          'border border-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.99]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-4 py-2.5',
        sm: 'min-h-9 rounded-lg px-3 py-1.5 text-xs',
        lg: 'min-h-12 rounded-2xl px-8 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
