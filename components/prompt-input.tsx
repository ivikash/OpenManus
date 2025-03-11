import React from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface PromptInputProps {
  onSubmit: (prompt: string, options: { model: string, modelProvider: string }) => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = React.useState('');
  const [model, setModel] = React.useState('llama2');
  const [modelProvider, setModelProvider] = React.useState('ollama');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt, { model, modelProvider });
      setPrompt('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter your prompt</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe what you want the browser to do..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={isLoading}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-provider">Model Provider</Label>
              <Select 
                value={modelProvider} 
                onValueChange={setModelProvider}
                disabled={isLoading}
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
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={model} 
                onValueChange={setModel}
                disabled={isLoading}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelProvider === 'ollama' ? (
                    <>
                      <SelectItem value="llama2">Llama 2</SelectItem>
                      <SelectItem value="llama3">Llama 3</SelectItem>
                      <SelectItem value="mistral">Mistral</SelectItem>
                      <SelectItem value="gemma">Gemma</SelectItem>
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
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading || !prompt.trim()}>
            {isLoading ? 'Running...' : 'Run Automation'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};