import React from 'react';
import { cn } from './cn.js';

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('min-h-11 w-full rounded-quest-md border border-quest-sky/25 bg-quest-deep/70 px-3 py-2 text-base text-quest-white placeholder:text-quest-mist/50 shadow-inner outline-none transition focus:border-quest-sky focus:ring-2 focus:ring-quest-sky/30 disabled:opacity-50', className)} {...props} />;
});

export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('min-h-28 w-full rounded-quest-md border border-quest-sky/25 bg-quest-deep/70 px-3 py-2 text-base text-quest-white placeholder:text-quest-mist/50 shadow-inner outline-none transition focus:border-quest-sky focus:ring-2 focus:ring-quest-sky/30 disabled:opacity-50', className)} {...props} />;
});
