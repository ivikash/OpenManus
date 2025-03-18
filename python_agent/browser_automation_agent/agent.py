#!/usr/bin/env python3
"""
Browser Automation Agent for OpenManus
"""

import asyncio
import json
import sys
import os
import traceback
import base64
from io import BytesIO
from typing import Dict, Any, Optional, List, Callable, Awaitable
from enum import Enum
from dotenv import load_dotenv
import boto3
from . import logger

# Load environment variables
load_dotenv()


class BrowserAutomationAgent:
    """
    Agent class for browser automation using browser-use
    """

    def __init__(
        self,
        task: str,
        model_provider: str = "ollama",
        model_name: Optional[str] = None,
        use_vision: bool = True,
        api_key: Optional[str] = None,
        debug: bool = False,
        headless: bool = True,
        browser_type: str = "chromium",
        timeout: int = 60000,
        aws_region: Optional[str] = None,
        aws_profile: Optional[str] = None,
        additional_options: Optional[Dict[str, Any]] = None,
        log_level: str = "INFO",
        log_file: Optional[str] = None,
    ):
        """
        Initialize the browser automation agent

        Args:
            task: The task description for the agent
            model_provider: The LLM provider (ollama, openai, or bedrock)
            model_name: The model name to use
            use_vision: Whether to use vision capabilities
            api_key: API key for the model provider
            debug: Enable debug mode
            headless: Run browser in headless mode
            browser_type: Type of browser to use (chromium, firefox, webkit)
            timeout: Timeout in milliseconds
            aws_region: AWS region for Bedrock
            aws_profile: AWS profile for Bedrock
            additional_options: Additional options for the agent
            log_level: Logging level
            log_file: Path to log file
        """
        # Initialize logger
        self.log = logger.get_logger(
            name="browser_agent", log_level=log_level, log_file=log_file
        )

        self.task = task
        self.model_provider = model_provider.lower()
        self.use_vision = use_vision
        self.debug = debug
        self.headless = headless
        self.browser_type = browser_type
        self.timeout = timeout
        self.additional_options = additional_options or {}
        self.aws_region = aws_region
        self.aws_profile = aws_profile

        # Set default model based on provider if not specified
        if not model_name:
            if self.model_provider == "ollama":
                self.model_name = "deepseek-r1:8b"
            elif self.model_provider == "openai":
                self.model_name = "gpt-4o"
            elif self.model_provider == "bedrock":
                self.model_name = "anthropic.claude-3-sonnet-20240229-v1:0"
            else:
                self.model_name = "deepseek-r1:8b"
        else:
            self.model_name = model_name

        # Set API key
        self.api_key = api_key
        if self.model_provider == "openai" and not self.api_key:
            self.api_key = os.environ.get("OPENAI_API_KEY")

        # Validate configuration
        self._validate_config()

        # Initialize callbacks
        self.new_step_callback = None
        self.done_callback = None

        self.log.info(
            "Initialized BrowserAutomationAgent",
            model_provider=self.model_provider,
            model_name=self.model_name,
            use_vision=self.use_vision,
            headless=self.headless,
            browser_type=self.browser_type,
        )

    def _validate_config(self) -> None:
        """Validate the agent configuration"""
        if self.model_provider not in ["ollama", "openai", "bedrock"]:
            error_msg = f"Unsupported model provider: {self.model_provider}. Must be 'ollama', 'openai', or 'bedrock'"
            self.log.error(error_msg)
            raise ValueError(error_msg)

        if self.model_provider == "openai" and not self.api_key:
            error_msg = "OpenAI API key is required when using OpenAI as the model provider"
            self.log.error(error_msg)
            raise ValueError(error_msg)

        if self.model_provider == "bedrock":
            if not self.aws_region:
                # Try to get region from environment or default to us-east-1
                self.aws_region = os.environ.get("AWS_REGION", "us-east-1")
                self.log.info(f"Using AWS region from environment: {self.aws_region}")

            # Validate AWS credentials
            try:
                session_kwargs = {}
                if self.aws_profile:
                    session_kwargs["profile_name"] = self.aws_profile

                session = boto3.Session(**session_kwargs)
                sts = session.client("sts")
                sts.get_caller_identity()
                self.log.info("AWS credentials validated successfully")
            except Exception as e:
                error_msg = f"Failed to validate AWS credentials: {str(e)}"
                self.log.error(error_msg, exception=str(e))
                raise ValueError(error_msg)

    def register_new_step_callback(
        self, callback: Callable[[Any, Any, int], Awaitable[None]]
    ) -> None:
        """Register callback for new steps"""
        self.new_step_callback = callback

    def register_done_callback(
        self, callback: Callable[[List[Any]], Awaitable[None]]
    ) -> None:
        """Register callback for completion"""
        self.done_callback = callback

    def _log_message(self, message: str, type: str = "system") -> None:
        """Log a message to stdout in JSON format"""
        print(json.dumps({"type": type, "message": message}))
        sys.stdout.flush()

    async def _default_new_step_callback(
        self, browser_state: Any, agent_output: Any, step_number: int
    ) -> None:
        """Default callback for new steps"""
        step_message = f"Step {step_number}: {agent_output.action_description if hasattr(agent_output, 'action_description') else 'Processing...'}"
        self.log.info(
            "Browser automation step",
            step_number=step_number,
            action=getattr(agent_output, "action_description", "Processing"),
        )
        self._log_message(step_message, "step")

        # Capture and send screenshot if browser state is available
        if browser_state and hasattr(browser_state, "page"):
            try:
                from PIL import Image

                screenshot = await browser_state.page.screenshot()
                # Convert screenshot to base64
                img = Image.open(BytesIO(screenshot))
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                img_str = base64.b64encode(buffered.getvalue()).decode()

                # Send screenshot data
                print(json.dumps({"type": "screenshot", "data": img_str}))
                sys.stdout.flush()
                self.log.debug("Screenshot captured and sent")
            except Exception as e:
                error_msg = f"Screenshot error: {str(e)}"
                self.log.error(error_msg, exception=str(e))
                self._log_message(error_msg, "error")

        # Call the user-provided callback if available
        if self.new_step_callback:
            await self.new_step_callback(browser_state, agent_output, step_number)

    async def _default_done_callback(self, history_list: List[Any]) -> None:
        """Default callback for completion"""
        self._log_message("Task completed", "complete")
        self.log.info(
            "Browser automation task completed",
            history_length=len(history_list) if history_list else 0,
        )

        # Call the user-provided callback if available
        if self.done_callback:
            await self.done_callback(history_list)

    async def run(self) -> Any:
        """Run the browser automation agent"""
        try:
            self._log_message(f"Starting browser automation with task: {self.task}")
            self._log_message(
                f"Using model provider: {self.model_provider}, model: {self.model_name}"
            )
            self.log.info(
                "Starting browser automation",
                task=self.task,
                model_provider=self.model_provider,
                model_name=self.model_name,
            )

            # Import and initialize the appropriate LLM based on provider
            if self.model_provider == "ollama":
                from langchain_ollama import ChatOllama

                self.log.info("Initializing Ollama LLM", model=self.model_name)
                llm = ChatOllama(
                    model=self.model_name,
                    num_ctx=32000,
                )
                self._log_message("Initialized Ollama LLM")
            elif self.model_provider == "openai":
                from langchain_openai import ChatOpenAI

                self.log.info("Initializing OpenAI LLM", model=self.model_name)
                llm = ChatOpenAI(
                    model=self.model_name,
                    temperature=0.0,
                    api_key=self.api_key,
                )
                self._log_message("Initialized OpenAI LLM")
            elif self.model_provider == "bedrock":
                from langchain_bedrock import Bedrock

                # Create AWS session
                session_kwargs = {}
                if self.aws_profile:
                    session_kwargs["profile_name"] = self.aws_profile

                session = boto3.Session(**session_kwargs)

                # Initialize Bedrock client
                self.log.info(
                    "Initializing AWS Bedrock LLM",
                    model=self.model_name,
                    region=self.aws_region,
                )

                # Configure model parameters based on the model
                model_kwargs = {"temperature": 0.0}

                # Anthropic Claude models use different parameters
                if "anthropic.claude" in self.model_name:
                    model_kwargs = {"temperature": 0.0, "max_tokens": 4096}

                llm = Bedrock(
                    model_id=self.model_name,
                    client=session.client(
                        "bedrock-runtime", region_name=self.aws_region
                    ),
                    model_kwargs=model_kwargs,
                )
                self._log_message("Initialized AWS Bedrock LLM")

            # Import and initialize the Agent
            from browser_use import Agent

            # Create agent options
            agent_options = {
                "task": self.task,
                "llm": llm,
                "use_vision": self.use_vision,
                "register_new_step_callback": self._default_new_step_callback,
                "register_done_callback": self._default_done_callback,
            }

            # Add any additional options
            agent_options.update(self.additional_options)

            # Create the agent
            self._log_message(f"Creating Agent with task: {self.task}")
            self.log.info("Creating browser-use Agent")
            agent = Agent(**agent_options)

            # Run the agent
            self._log_message("Running the agent...")
            self.log.info("Running browser-use Agent")
            result = await agent.run()

            # Process the final result
            if hasattr(result, "final_result") and callable(result.final_result):
                final_result = result.final_result()
                if final_result:
                    self._log_message(f"Final result: {final_result}", "result")
                    self.log.info("Agent final result", result=final_result)

            # Process visited URLs
            if hasattr(result, "urls") and callable(result.urls):
                urls = result.urls()
                if urls:
                    urls_str = ", ".join(urls)
                    self._log_message(f"Visited URLs: {urls_str}", "urls")
                    self.log.info("Agent visited URLs", urls=urls)

            return result

        except Exception as e:
            error_msg = f"Error in agent execution: {str(e)}"
            self.log.exception(error_msg)
            self._log_message(error_msg, "error")
            self._log_message(f"Traceback: {traceback.format_exc()}", "error")
            raise
