"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getSocket } from "@/lib/socket";

export default function PromptForm() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelProvider, setModelProvider] = useState("ollama");
  const [model, setModel] = useState(modelProvider === "ollama" ? "llama3.2" : "gpt-4o");
  const [useVision, setUseVision] = useState(true);
  const [headless, setHeadless] = useState(true);
  const [browserType, setBrowserType] = useState("chromium");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  
  // Update model when provider changes
  const handleProviderChange = (value: string) => {
    setModelProvider(value);
    if (value === "ollama") {
      setModel("llama3.2");
    } else if (value === "openai") {
      setModel("gpt-4o");
    } else if (value === "bedrock") {
      setModel("anthropic.claude-3-sonnet-20240229-v1:0");
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    
    // Send prompt with all configuration options
    const socket = getSocket();
    socket.emit("prompt:submit", {
      prompt,
      options: {
        modelProvider,
        model,
        useVision,
        headless,
        browserType,
        ...(modelProvider === "bedrock" && { awsRegion })
      }
    });
  };
  
  const handleStop = () => {
    const socket = getSocket();
    socket.emit("automation:stop");
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt">Enter your task</Label>
        <Textarea
          id="prompt"
          placeholder="Describe what you want the browser to do..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px]"
          disabled={isLoading}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model-provider">Model Provider</Label>
          <Select 
            value={modelProvider} 
            onValueChange={handleProviderChange}
            disabled={isLoading}
          >
            <SelectTrigger id="model-provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="bedrock">AWS Bedrock</SelectItem>
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
              {modelProvider === "ollama" ? (
                <>
                  <SelectItem value="llama3.2">Llama 3.2</SelectItem>
                  <SelectItem value="llama3">Llama 3</SelectItem>
                  <SelectItem value="llama2">Llama 2</SelectItem>
                </>
              ) : modelProvider === "openai" ? (
                <>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="anthropic.claude-3-sonnet-20240229-v1:0">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="anthropic.claude-3-haiku-20240307-v1:0">Claude 3 Haiku</SelectItem>
                  <SelectItem value="anthropic.claude-3-opus-20240229-v1:0">Claude 3 Opus</SelectItem>
                  <SelectItem value="meta.llama3-70b-instruct-v1:0">Llama 3 70B</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="use-vision" 
          checked={useVision} 
          onCheckedChange={setUseVision}
          disabled={isLoading}
        />
        <Label htmlFor="use-vision">Enable vision capabilities</Label>
      </div>
      
      {modelProvider === "bedrock" && (
        <div className="space-y-2">
          <Label htmlFor="aws-region">AWS Region</Label>
          <Select 
            value={awsRegion} 
            onValueChange={setAwsRegion}
            disabled={isLoading}
          >
            <SelectTrigger id="aws-region">
              <SelectValue placeholder="Select AWS region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
              <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
              <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
              <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="show-advanced" 
          checked={showAdvanced} 
          onCheckedChange={setShowAdvanced}
          disabled={isLoading}
        />
        <Label htmlFor="show-advanced">Show advanced options</Label>
      </div>
      
      {showAdvanced && (
        <div className="space-y-4 border rounded-md p-4 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Switch 
              id="headless" 
              checked={headless} 
              onCheckedChange={setHeadless}
              disabled={isLoading}
            />
            <Label htmlFor="headless">Run browser in headless mode</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="browser-type">Browser Type</Label>
            <Select 
              value={browserType} 
              onValueChange={setBrowserType}
              disabled={isLoading}
            >
              <SelectTrigger id="browser-type">
                <SelectValue placeholder="Select browser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chromium">Chromium</SelectItem>
                <SelectItem value="firefox">Firefox</SelectItem>
                <SelectItem value="webkit">WebKit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      <div className="flex space-x-2">
        <Button 
          type="submit" 
          disabled={isLoading || !prompt.trim()}
          className="flex-1"
        >
          {isLoading ? "Running..." : "Run Automation"}
        </Button>
        
        {isLoading && (
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleStop}
          >
            Stop
          </Button>
        )}
      </div>
    </form>
  );
}
