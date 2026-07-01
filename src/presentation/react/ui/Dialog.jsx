import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './cn.js';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = React.forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-quest-deep/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out', className)} {...props} />;
});

export const DialogContent = React.forwardRef(function DialogContent({ className, children, ...props }, ref) {
  return <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn('fixed left-1/2 top-1/2 z-50 grid w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-quest-xl border border-quest-sky/25 bg-quest-deep p-5 text-quest-white shadow-quest-glow outline-none', className)} {...props}>{children}<DialogPrimitive.Close className="absolute left-3 top-3 rounded-full p-2 text-quest-mist hover:bg-quest-sky/10 hover:text-quest-white" aria-label="סגירה"><X size={18} /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPortal>;
});

export const DialogHeader = React.forwardRef(function DialogHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('grid gap-1 text-start', className)} {...props} />;
});

export const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('m-0 text-xl font-black text-quest-white', className)} {...props} />;
});

export const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('m-0 text-sm leading-6 text-quest-mist/80', className)} {...props} />;
});
