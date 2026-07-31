import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const alertVariants = cva(
  'relative flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-elevation-1 [&>svg]:mt-0.5 [&>svg]:size-[1.125rem] [&>svg]:shrink-0 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default:
          'border-primary/20 bg-primary/10 text-foreground [&>svg]:text-primary',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive [&>svg]:text-destructive',
        success:
          'border-income/25 bg-income/10 text-foreground [&>svg]:text-income',
        warning:
          'border-finance/30 bg-finance/10 text-foreground [&>svg]:text-finance-text',
        info:
          'border-primary/20 bg-primary/10 text-foreground [&>svg]:text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-snug tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm leading-relaxed text-muted-foreground [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
