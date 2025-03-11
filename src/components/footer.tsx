import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t mt-8">
      <div className="container mx-auto py-4">
        <div className="text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} OpenManus
        </div>
      </div>
    </footer>
  );
};
