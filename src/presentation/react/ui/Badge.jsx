import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './cn.js';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-black leading-none',
  {
    variants: {
      variant: {
        default: 'border-quest-sky/35 bg-quest-sky/15 text-quest-white',
        primary: 'border-quest-primary bg-quest-primary text-quest-white',
        success: 'border-emerald-300/50 bg-emerald-400/15 text-emerald-100',
        warning: 'border-amber-300/55 bg-amber-400/15 text-amber-100',
        danger: 'border-red-300/55 bg-red-500/15 text-red-100'
      }
    },
    defaultVariants: { variant: 'default' }
  }
);

export const Badge = React.forwardRef(function Badge({ className, variant, ...props }, ref) {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});
