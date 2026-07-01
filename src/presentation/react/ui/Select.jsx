import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn.js';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef(function SelectTrigger({ className, children, ...props }, ref) {
  return <SelectPrimitive.Trigger ref={ref} className={cn('inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-quest-md border border-quest-sky/25 bg-quest-deep/70 px-3 py-2 text-base text-quest-white outline-none transition focus:border-quest-sky focus:ring-2 focus:ring-quest-sky/30 disabled:opacity-50', className)} {...props}>{children}<SelectPrimitive.Icon asChild><ChevronDown size={18} /></SelectPrimitive.Icon></SelectPrimitive.Trigger>;
});

export const SelectContent = React.forwardRef(function SelectContent({ className, children, ...props }, ref) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content ref={ref} className={cn('z-50 max-h-72 min-w-[10rem] overflow-hidden rounded-quest-lg border border-quest-sky/25 bg-quest-deep text-quest-white shadow-quest-card', className)} {...props}><SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>;
});

export const SelectItem = React.forwardRef(function SelectItem({ className, children, ...props }, ref) {
  return <SelectPrimitive.Item ref={ref} className={cn('relative flex cursor-pointer select-none items-center rounded-quest-sm py-2 pe-3 ps-8 text-sm outline-none hover:bg-quest-sky/10 focus:bg-quest-sky/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props}><span className="absolute start-2 flex h-4 w-4 items-center justify-center"><SelectPrimitive.ItemIndicator><Check size={16} /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>;
});
