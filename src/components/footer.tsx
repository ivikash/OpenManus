import React from 'react';

export function Footer() {
  return (
    <footer className="border-t p-4 text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} Browser Use Demo</p>
    </footer>
  );
}