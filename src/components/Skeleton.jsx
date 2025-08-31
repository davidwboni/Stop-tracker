import React from 'react';

const Skeleton = ({ 
  width = 'w-full', 
  height = 'h-4', 
  rounded = 'rounded', 
  className = '' 
}) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${width} ${height} ${rounded} ${className}`}
    />
  );
};

const SkeletonCard = () => {
  return (
    <div className="p-4 sm:p-6 transition-all duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <Skeleton width="w-24" height="h-3" className="mb-2" />
          <Skeleton width="w-16" height="h-8" className="mb-2" />
          <Skeleton width="w-32" height="h-3" />
        </div>
        <Skeleton width="w-12" height="h-12" rounded="rounded-2xl" className="ml-4" />
      </div>
      <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-700">
        <Skeleton width="w-20" height="h-6" rounded="rounded-full" />
      </div>
    </div>
  );
};

const SkeletonList = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1">
              <Skeleton width="w-12" height="h-12" rounded="rounded-2xl" />
              <div className="flex-1">
                <Skeleton width="w-24" height="h-4" className="mb-1" />
                <Skeleton width="w-16" height="h-3" />
              </div>
            </div>
            <Skeleton width="w-12" height="h-6" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Skeleton width="w-8" height="h-6" className="mx-auto mb-1" />
              <Skeleton width="w-12" height="h-3" className="mx-auto" />
            </div>
            <div>
              <Skeleton width="w-8" height="h-6" className="mx-auto mb-1" />
              <Skeleton width="w-12" height="h-3" className="mx-auto" />
            </div>
            <div>
              <Skeleton width="w-8" height="h-6" className="mx-auto mb-1" />
              <Skeleton width="w-12" height="h-3" className="mx-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SkeletonTabs = () => {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-0">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton 
            key={i} 
            width="w-full" 
            height="h-12" 
            rounded="rounded-lg" 
            className="min-h-[48px]" 
          />
        ))}
      </div>
    </div>
  );
};

const SkeletonStats = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export { Skeleton, SkeletonCard, SkeletonList, SkeletonTabs, SkeletonStats };
export default Skeleton;