#!/usr/bin/env python3
"""
Command-line interface for the Browser Automation Agent
"""

import asyncio
import argparse
import json
import sys
import os
from typing import Optional, Dict, Any
from .agent import BrowserAutomationAgent
from . import logger


def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Browser Automation Agent")

    # Required arguments
    parser.add_argument("--task", required=True, help="The task to perform")

    # Model provider options
    parser.add_argument(
        "--model-provider",
        default="ollama",
        choices=["ollama", "openai", "bedrock"],
        help="The model provider to use (ollama, openai, or bedrock)",
    )
    parser.add_argument("--model-name", help="The model name to use")

    # Vision options
    parser.add_argument(
        "--use-vision",
        action="store_true",
        default=True,
        help="Use vision capabilities",
    )
    parser.add_argument(
        "--no-vision",
        dest="use_vision",
        action="store_false",
        help="Disable vision capabilities",
    )

    # API keys and authentication
    parser.add_argument("--api-key", help="API key for the model provider")

    # AWS Bedrock options
    parser.add_argument("--aws-region", help="AWS region for Bedrock")
    parser.add_argument("--aws-profile", help="AWS profile for Bedrock")

    # Browser options
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument(
        "--headless",
        action="store_true",
        default=True,
        help="Run browser in headless mode",
    )
    parser.add_argument(
        "--no-headless",
        dest="headless",
        action="store_false",
        help="Run browser in visible mode",
    )
    parser.add_argument(
        "--browser-type",
        default="chromium",
        choices=["chromium", "firefox", "webkit"],
        help="Type of browser to use",
    )
    parser.add_argument(
        "--timeout", type=int, default=60000, help="Timeout in milliseconds"
    )

    # Logging options
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging level",
    )
    parser.add_argument("--log-file", help="Path to log file")

    # Configuration file
    parser.add_argument("--config", help="Path to JSON configuration file")

    return parser.parse_args()


def load_config_file(config_path: str) -> Dict[str, Any]:
    """Load configuration from a JSON file"""
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config file: {str(e)}", file=sys.stderr)
        sys.exit(1)


async def run_agent(args: argparse.Namespace, config: Optional[Dict[str, Any]] = None) -> Any:
    """Run the browser automation agent"""
    # Merge config file with command line arguments if provided
    options = {}
    if config:
        options.update(config)

    # Set up logging
    log = logger.get_logger(
        name="browser_agent_cli", log_level=args.log_level, log_file=args.log_file
    )

    log.info(
        "Starting browser automation agent from CLI",
        task=args.task,
        model_provider=args.model_provider,
        model_name=args.model_name,
    )

    try:
        # Command line arguments take precedence over config file
        agent = BrowserAutomationAgent(
            task=args.task,
            model_provider=args.model_provider,
            model_name=args.model_name,
            use_vision=args.use_vision,
            api_key=args.api_key,
            debug=args.debug,
            headless=args.headless,
            browser_type=args.browser_type,
            timeout=args.timeout,
            aws_region=args.aws_region,
            aws_profile=args.aws_profile,
            additional_options=options.get("additional_options", {}),
            log_level=args.log_level,
            log_file=args.log_file,
        )

        return await agent.run()
    except Exception as e:
        log.exception(f"Error running agent: {str(e)}")
        raise


def main() -> None:
    """Main entry point"""
    args = parse_args()

    # Load config file if provided
    config = None
    if args.config:
        config = load_config_file(args.config)

    try:
        asyncio.run(run_agent(args, config))
    except KeyboardInterrupt:
        print(
            json.dumps({"type": "system", "message": "Automation stopped by user"})
        )
        sys.exit(1)
    except Exception as e:
        print(
            json.dumps({"type": "error", "message": f"Critical error: {str(e)}"})
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
