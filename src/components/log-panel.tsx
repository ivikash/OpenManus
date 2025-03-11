import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface Log {
  id: string;
  text: string;
  type: 'system' | 'error' | 'result' | 'urls';
  timestamp: string;
}

interface LogPanelProps {
  logs: Log[];
}

export function LogPanel({ logs }: LogPanelProps) {
  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Automation Logs</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[500px] w-full pr-4">
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded text-sm ${
                  log.type === 'error'
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    : log.type === 'result'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : log.type === 'urls'
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono">{log.text}</span>
                  <span className="text-xs text-gray-500 ml-2">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}