"""
Browser Automation Agent for OpenManus
"""

__version__ = "0.1.0"

from .agent import BrowserAutomationAgent
from .models import (
    AutomationRequest,
    LogMessage,
    ScreenshotMessage,
    AutomationResult,
    ModelProvider,
    BrowserType,
    LogLevel,
)

__all__ = [
    "BrowserAutomationAgent",
    "AutomationRequest",
    "LogMessage",
    "ScreenshotMessage",
    "AutomationResult",
    "ModelProvider",
    "BrowserType",
    "LogLevel",
]
