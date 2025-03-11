import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface PromptInputProps {
  onSubmit: (prompt: string, options?: { model: string, modelProvider: string }) => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}

export function PromptInput({ onSubmit, isDisabled = false, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('llama3.2');
  const [modelProvider, setModelProvider] = useState('ollama');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isDisabled && !isLoading) {
      onSubmit(prompt, { model, modelProvider });
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          disabled={isDisabled || isLoading}
          className="flex-1"
        />
        <Button 
          type="submit"
          disabled={isDisabled || isLoading || !prompt.trim()}
          className="px-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit
            </>
          )}
        </Button>
      </div>
      
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
    </form>
  );
}