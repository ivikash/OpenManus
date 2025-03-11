"use client";

import { useState } from "react";
import { BrowserUsePanel } from "@/components/browser-use-panel";
import { LogPanel } from "@/components/log-panel";
import { SocketProvider } from "@/providers/socket-provider";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);

  const handleLog = (log: any) => {
    setLogs((prevLogs) => [...prevLogs, log]);
  };

  return (
    <SocketProvider>
      <main className="container mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-center my-6">OpenManus Browser Automation</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <BrowserUsePanel onLog={handleLog} />
          </div>
          <div>
            <LogPanel logs={logs} />
          </div>
        </div>
      </main>
    </SocketProvider>
  );
}