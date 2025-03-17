"""
Data models for the browser automation agent API
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ModelProvider(str, Enum):
    """Model provider options"""
    OLLAMA = "ollama"
    OPENAI = "openai"
    BEDROCK = "bedrock"


class BrowserType(str, Enum):
    """Browser type options"""
    CHROMIUM = "chromium"
    FIREFOX = "firefox"
    WEBKIT = "webkit"


class LogLevel(str, Enum):
    """Log level options"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class AutomationRequest(BaseModel):
    """Request model for browser automation"""
    task: str = Field(..., description="The task to perform")
    model_provider: ModelProvider = Field(
        default=ModelProvider.OLLAMA, description="The model provider to use"
    )
    model_name: Optional[str] = Field(
        default=None, description="The model name to use"
    )
    use_vision: bool = Field(
        default=True, description="Whether to use vision capabilities"
    )
    api_key: Optional[str] = Field(
        default=None, description="API key for the model provider"
    )
    headless: bool = Field(
        default=True, description="Whether to run browser in headless mode"
    )
    browser_type: BrowserType = Field(
        default=BrowserType.CHROMIUM, description="Type of browser to use"
    )
    timeout: int = Field(
        default=60000, description="Timeout in milliseconds"
    )
    aws_region: Optional[str] = Field(
        default=None, description="AWS region for Bedrock"
    )
    aws_profile: Optional[str] = Field(
        default=None, description="AWS profile for Bedrock"
    )
    additional_options: Dict[str, Any] = Field(
        default_factory=dict, description="Additional options for the agent"
    )


class LogMessage(BaseModel):
    """Log message model"""
    id: str = Field(..., description="Unique ID for the message")
    text: str = Field(..., description="Message text")
    type: str = Field(..., description="Message type")
    timestamp: str = Field(..., description="Message timestamp")


class ScreenshotMessage(BaseModel):
    """Screenshot message model"""
    data: str = Field(..., description="Base64-encoded screenshot data")


class AutomationResult(BaseModel):
    """Result model for browser automation"""
    success: bool = Field(..., description="Whether the automation was successful")
    stopped: Optional[bool] = Field(
        default=None, description="Whether the automation was stopped by the user"
    )
    message: Optional[str] = Field(
        default=None, description="Result message"
    )


class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    event: str = Field(..., description="Event type")
    data: Dict[str, Any] = Field(..., description="Event data")


class ClientInfo(BaseModel):
    """Client information model"""
    client_id: str = Field(..., description="Client ID")
    connected_at: str = Field(..., description="Connection timestamp")
    user_agent: Optional[str] = Field(default=None, description="User agent")
    ip_address: Optional[str] = Field(default=None, description="IP address")


class ServerStatus(BaseModel):
    """Server status model"""
    status: str = Field(..., description="Server status")
    version: str = Field(..., description="Server version")
    uptime: float = Field(..., description="Server uptime in seconds")
    active_clients: int = Field(..., description="Number of active clients")
    active_automations: int = Field(..., description="Number of active automations")
