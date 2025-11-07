"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const baseClasses = "bg-gray-700 rounded";
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded",
  };
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-pulse",
    none: "",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="rectangular" className="h-12 flex-1" />
          <Skeleton variant="rectangular" className="h-12 w-32" />
          <Skeleton variant="rectangular" className="h-12 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-gray-700/50 bg-gray-800/50">
      <Skeleton variant="text" className="h-6 w-1/3 mb-4" />
      <Skeleton variant="rectangular" className="h-80 w-full" />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-4 w-20" />
        <Skeleton variant="rectangular" className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="rectangular" className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="h-4 w-32" />
        <Skeleton variant="rectangular" className="h-24 w-full" />
      </div>
      <div className="flex gap-3 pt-2">
        <Skeleton variant="rectangular" className="h-10 w-24" />
        <Skeleton variant="rectangular" className="h-10 w-20" />
      </div>
    </div>
  );
}

