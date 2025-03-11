'use client';

import React, { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface PromptInputProps {
  onSubmit: (prompt: string, options: { model: string, modelProvider: string }) => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export const PromptInput = ({ onSubmit, isLoading = false, isDisabled = false }: PromptInputProps) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('llama3.2');
  const [modelProvider, setModelProvider] = useState('ollama');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading && !isDisabled) {
      onSubmit(prompt, { model, modelProvider });
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Describe what you want the browser to do..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[120px] resize-none"
        disabled={isLoading || isDisabled}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model-provider">Model Provider</Label>
          <Select 
            value={modelProvider} 
            onValueChange={setModelProvider}
            disabled={isLoading || isDisabled}
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
            disabled={isLoading || isDisabled}
          >
            <SelectTrigger id="model">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelProvider === 'ollama' ? (
                <>
                  <SelectItem value="deepseek-r1:8b">deepseek-r1:8b</SelectItem>
                  <SelectItem value="llama2">Llama 2</SelectItem>
                  <SelectItem value="llama3.2">Llama 3.2</SelectItem>
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

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || isDisabled || !prompt.trim()}>
          {isLoading ? 'Running...' : 'Run Automation'}
        </Button>
      </div>
    </form>
  );
};

export default PromptInput;
