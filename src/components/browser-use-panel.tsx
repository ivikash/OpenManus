import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useSocket } from '@/hooks/use-socket';
import { useToast } from './ui/use-toast';
import { Loader2 } from 'lucide-react';

interface BrowserUsePanelProps {
  onLog: (log: any) => void;
}

export function BrowserUsePanel({ onLog }: BrowserUsePanelProps) {
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [useVision, setUseVision] = useState(true);
  const [model, setModel] = useState('llama3.2');
  const [modelProvider, setModelProvider] = useState('ollama');
  const { socket } = useSocket();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!task.trim()) {
      toast({
        title: 'Task required',
        description: 'Please enter a task for the browser automation',
        variant: 'destructive',
      });
      return;
    }
    
    setIsRunning(true);
    
    socket?.emit('prompt:submit', {
      prompt: task,
      options: {
        model,
        modelProvider,
        useVision,
      }
    });
  };

  const handleStop = () => {
    socket?.emit('automation:stop');
  };

  React.useEffect(() => {
    if (!socket) return;

    const handleLog = (log: any) => {
      onLog(log);
    };

    const handleComplete = (result: { success: boolean; stopped?: boolean }) => {
      setIsRunning(false);
      
      if (result.stopped) {
        toast({
          title: 'Automation stopped',
          description: 'The browser automation was stopped by user',
        });
      } else if (result.success) {
        toast({
          title: 'Automation completed',
          description: 'The browser automation completed successfully',
        });
      } else {
        toast({
          title: 'Automation failed',
          description: 'The browser automation encountered an error',
          variant: 'destructive',
        });
      }
    };

    const handleError = (error: any) => {
      setIsRunning(false);
      toast({
        title: 'Automation error',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    };

    socket.on('automation:log', handleLog);
    socket.on('automation:complete', handleComplete);
    socket.on('automation:error', handleError);

    return () => {
      socket.off('automation:log', handleLog);
      socket.off('automation:complete', handleComplete);
      socket.off('automation:error', handleError);
    };
  }, [socket, onLog, toast]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Browser Automation</CardTitle>
        <CardDescription>
          Use AI to control your browser and perform tasks automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task">Task Description</Label>
            <Textarea
              id="task"
              placeholder="Describe what you want the AI to do in your browser..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="min-h-[100px]"
              disabled={isRunning}
            />
          </div>
          
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="model-provider">Model Provider</Label>
              <Select 
                value={modelProvider} 
                onValueChange={setModelProvider}
                disabled={isRunning}
              >
                <SelectTrigger id="model-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">Ollama</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={model} 
                onValueChange={setModel}
                disabled={isRunning}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelProvider === 'ollama' ? (
                    <>
                      <SelectItem value="llama3.2">Llama 3.2</SelectItem>
                      <SelectItem value="qwen2.5">Qwen 2.5</SelectItem>
                      <SelectItem value="mistral">Mistral</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="use-vision"
                checked={useVision}
                onCheckedChange={setUseVision}
                disabled={isRunning}
              />
              <Label htmlFor="use-vision">Enable Vision</Label>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {isRunning ? 'Automation in progress...' : 'Ready to automate'}
        </div>
        <div className="flex space-x-2">
          {isRunning ? (
            <Button variant="destructive" onClick={handleStop}>
              Stop Automation
            </Button>
          ) : (
            <Button type="submit" onClick={handleSubmit}>
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Start Automation'
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}