import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from './cn.js';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  return <TabsPrimitive.List ref={ref} className={cn('inline-flex flex-wrap items-center gap-2 rounded-quest-lg border border-quest-sky/15 bg-quest-deep/70 p-1', className)} {...props} />;
});

export const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return <TabsPrimitive.Trigger ref={ref} className={cn('rounded-quest-md px-4 py-2 text-sm font-black text-quest-mist transition hover:bg-quest-sky/10 data-[state=active]:bg-quest-primary data-[state=active]:text-quest-white data-[state=active]:shadow-quest-card', className)} {...props} />;
});

export const TabsContent = React.forwardRef(function TabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn('mt-4 outline-none', className)} {...props} />;
});
