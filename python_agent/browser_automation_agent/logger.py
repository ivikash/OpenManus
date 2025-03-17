"""
Logging module for browser automation agent
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Define log levels
CRITICAL = 50
ERROR = 40
WARNING = 30
INFO = 20
DEBUG = 10


class JsonFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings after parsing the log record.
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON
        """
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if available
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info),
            }

        # Add extra fields from the record
        if hasattr(record, "extra"):
            log_data["extra"] = record.extra

        return json.dumps(log_data)


class Logger:
    """
    Custom logger for browser automation agent
    """

    def __init__(
        self,
        name: str = "browser_automation_agent",
        log_level: Optional[str] = None,
        log_file: Optional[str] = None,
    ):
        """
        Initialize logger

        Args:
            name: Logger name
            log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            log_file: Path to log file
        """
        self.logger = logging.getLogger(name)

        # Set log level from environment variable or parameter
        log_level = log_level or os.environ.get("BROWSER_AGENT_LOG_LEVEL", "INFO")
        level = getattr(logging, log_level.upper(), logging.INFO)
        self.logger.setLevel(level)

        # Clear existing handlers
        if self.logger.handlers:
            self.logger.handlers.clear()

        # Create console handler with JSON formatter
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setFormatter(JsonFormatter())
        self.logger.addHandler(console_handler)

        # Create file handler if log file is specified
        if log_file:
            log_dir = os.path.dirname(log_file)
            if log_dir:
                os.makedirs(log_dir, exist_ok=True)
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5,
            )
            file_handler.setFormatter(JsonFormatter())
            self.logger.addHandler(file_handler)

    def debug(self, message: str, **kwargs: Any) -> None:
        """Log debug message"""
        self.logger.debug(message, extra={"extra": kwargs})

    def info(self, message: str, **kwargs: Any) -> None:
        """Log info message"""
        self.logger.info(message, extra={"extra": kwargs})

    def warning(self, message: str, **kwargs: Any) -> None:
        """Log warning message"""
        self.logger.warning(message, extra={"extra": kwargs})

    def error(self, message: str, **kwargs: Any) -> None:
        """Log error message"""
        self.logger.error(message, extra={"extra": kwargs})

    def critical(self, message: str, **kwargs: Any) -> None:
        """Log critical message"""
        self.logger.critical(message, extra={"extra": kwargs})

    def exception(self, message: str, **kwargs: Any) -> None:
        """Log exception with traceback"""
        self.logger.exception(message, extra={"extra": kwargs})


# Create default logger instance
default_logger = Logger()

# Export functions for convenience
debug = default_logger.debug
info = default_logger.info
warning = default_logger.warning
error = default_logger.error
critical = default_logger.critical
exception = default_logger.exception


def get_logger(
    name: Optional[str] = None, log_level: Optional[str] = None, log_file: Optional[str] = None
) -> Logger:
    """
    Get a configured logger instance

    Args:
        name: Logger name
        log_level: Log level
        log_file: Path to log file

    Returns:
        Logger instance
    """
    return Logger(name=name, log_level=log_level, log_file=log_file)
