import React from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function Header() {
  return (
    <header className="border-b p-4">
      <Card className="bg-primary/5 border-none shadow-none">
        <CardHeader className="p-4">
          <CardTitle className="text-2xl font-bold">Browser Use Demo</CardTitle>
        </CardHeader>
      </Card>
    </header>
  );
}