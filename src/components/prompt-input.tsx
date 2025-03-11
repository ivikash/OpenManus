import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}

export function PromptInput({ onSubmit, isDisabled = false, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isDisabled && !isLoading) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
    </form>
  );
}