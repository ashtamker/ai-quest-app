import React from 'react';
import { cn } from './cn.js';

export const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return <section ref={ref} className={cn('rounded-quest-xl border border-quest-sky/20 bg-quest-deep/80 p-5 text-quest-white shadow-quest-card backdrop-blur', className)} {...props} />;
});

export const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props} />;
});

export const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h2 ref={ref} className={cn('m-0 text-xl font-black text-quest-white', className)} {...props} />;
});

export const CardDescription = React.forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('m-0 text-sm leading-6 text-quest-mist/80', className)} {...props} />;
});

export const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('grid gap-3', className)} {...props} />;
});
