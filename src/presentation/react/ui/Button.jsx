import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './cn.js';

export const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-quest-md border border-transparent px-4 py-2 text-sm font-black transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-quest-sky disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-quest-primary text-quest-white shadow-quest-card hover:brightness-110 active:scale-[0.98]',
        secondary: 'border-quest-sky/40 bg-quest-sky/15 text-quest-white hover:bg-quest-sky/25',
        ghost: 'border-quest-sky/20 bg-transparent text-quest-sky hover:bg-quest-sky/10',
        danger: 'bg-red-700 text-white shadow-quest-card hover:bg-red-600 active:scale-[0.98]',
        success: 'bg-emerald-500 text-quest-deep shadow-quest-card hover:bg-emerald-400 active:scale-[0.98]'
      },
      size: {
        sm: 'min-h-9 rounded-quest-sm px-3 py-1.5 text-xs',
        md: 'min-h-11 px-4 py-2 text-sm',
        lg: 'min-h-13 rounded-quest-lg px-5 py-3 text-base'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export const Button = React.forwardRef(function Button({ className, variant, size, ...props }, ref) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
