"""
FastAPI server for browser automation agent
"""

import os
import json
import time
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request, WebSocketException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocketState
from pydantic import ValidationError
from dotenv import load_dotenv

from .agent import BrowserAutomationAgent
from .models import (
    AutomationRequest,
    LogMessage,
    ScreenshotMessage,
    AutomationResult,
    WebSocketMessage,
    ClientInfo,
    ServerStatus,
)
from . import logger

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Browser Automation Agent",
    description="API for browser automation using browser-use",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize logger
log = logger.get_logger(
    name="browser_agent_server",
    log_level=os.environ.get("LOG_LEVEL", "INFO"),
    log_file=os.environ.get("LOG_FILE"),
)

# Server start time
START_TIME = time.time()

# Store active clients and automations
active_clients: Dict[str, ClientInfo] = {}
active_automations: Dict[str, asyncio.Task] = {}


class ConnectionManager:
    """WebSocket connection manager"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Connect a client"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        log.info("Client connected", client_id=client_id)

    def disconnect(self, client_id: str) -> None:
        """Disconnect a client"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            log.info("Client disconnected", client_id=client_id)

    async def send_message(self, client_id: str, event: str, data: Any) -> None:
        """Send a message to a client"""
        if client_id in self.active_connections:
            message = WebSocketMessage(event=event, data=data)
            await self.active_connections[client_id].send_text(message.model_dump_json())
            log.debug("Message sent to client", client_id=client_id, event=event)

    async def broadcast(self, event: str, data: Any) -> None:
        """Broadcast a message to all clients"""
        message = WebSocketMessage(event=event, data=data)
        json_message = message.model_dump_json()
        for client_id, connection in self.active_connections.items():
            await connection.send_text(json_message)
        log.debug("Message broadcast to all clients", event=event, client_count=len(self.active_connections))


# Initialize connection manager
manager = ConnectionManager()


async def run_automation(client_id: str, request: AutomationRequest) -> None:
    """Run browser automation"""
    try:
        log.info(
            "Starting automation for client",
            client_id=client_id,
            task=request.task,
            model_provider=request.model_provider,
        )

        # Send initial log message
        await manager.send_message(
            client_id,
            "automation:log",
            {
                "id": str(uuid.uuid4()),
                "text": f"Starting automation with task: {request.task}",
                "type": "system",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
            },
        )

        # Send configuration details
        await manager.send_message(
            client_id,
            "automation:log",
            {
                "id": str(uuid.uuid4()),
                "text": f"Configuration: Model Provider: {request.model_provider}, "
                f"Model: {request.model_name or 'default'}, "
                f"Vision: {'Enabled' if request.use_vision else 'Disabled'}",
                "type": "config",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
            },
        )

        # Create agent with callbacks
        agent = BrowserAutomationAgent(
            task=request.task,
            model_provider=request.model_provider,
            model_name=request.model_name,
            use_vision=request.use_vision,
            api_key=request.api_key,
            debug=True,
            headless=request.headless,
            browser_type=request.browser_type,
            timeout=request.timeout,
            aws_region=request.aws_region,
            aws_profile=request.aws_profile,
            additional_options=request.additional_options,
            log_level="DEBUG",
        )

        # Define custom callbacks
        async def new_step_callback(browser_state, agent_output, step_number):
            """Callback for new steps"""
            step_message = f"Step {step_number}: {agent_output.action_description if hasattr(agent_output, 'action_description') else 'Processing...'}"
            await manager.send_message(
                client_id,
                "automation:log",
                {
                    "id": str(uuid.uuid4()),
                    "text": step_message,
                    "type": "step",
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                },
            )

        async def done_callback(history_list):
            """Callback for completion"""
            await manager.send_message(
                client_id,
                "automation:log",
                {
                    "id": str(uuid.uuid4()),
                    "text": "Task completed",
                    "type": "complete",
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                },
            )

        # Register callbacks
        agent.register_new_step_callback(new_step_callback)
        agent.register_done_callback(done_callback)

        # Override the _log_message method to send logs to the client
        original_log_message = agent._log_message

        def new_log_message(message: str, type: str = "system"):
            """Override log message to send to client"""
            original_log_message(message, type)
            asyncio.create_task(
                manager.send_message(
                    client_id,
                    "automation:log",
                    {
                        "id": str(uuid.uuid4()),
                        "text": message,
                        "type": type,
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                    },
                )
            )

        agent._log_message = new_log_message

        # Run the agent
        result = await agent.run()

        # Send completion message
        await manager.send_message(
            client_id,
            "automation:complete",
            {"success": True, "message": "Automation completed successfully"},
        )

        log.info(
            "Automation completed for client",
            client_id=client_id,
            success=True,
        )

    except asyncio.CancelledError:
        log.info("Automation cancelled for client", client_id=client_id)
        await manager.send_message(
            client_id,
            "automation:log",
            {
                "id": str(uuid.uuid4()),
                "text": "Automation stopped by user",
                "type": "system",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
            },
        )
        await manager.send_message(
            client_id,
            "automation:complete",
            {"success": False, "stopped": True, "message": "Automation stopped by user"},
        )
        raise

    except Exception as e:
        log.exception("Error in automation", client_id=client_id, error=str(e))
        await manager.send_message(
            client_id,
            "automation:log",
            {
                "id": str(uuid.uuid4()),
                "text": f"Error: {str(e)}",
                "type": "error",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
            },
        )
        await manager.send_message(
            client_id,
            "automation:error",
            {"message": str(e)},
        )
        await manager.send_message(
            client_id,
            "automation:complete",
            {"success": False, "message": str(e)},
        )
    finally:
        # Remove from active automations
        if client_id in active_automations:
            del active_automations[client_id]


@app.get("/")
async def root():
    """Root endpoint that returns a simple HTML page with WebSocket test"""
    html_content = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Browser Automation Agent</title>
        </head>
        <body>
            <h1>Browser Automation Agent</h1>
            <p>WebSocket Status: <span id="ws-status">Connecting...</span></p>
            <script>
                const ws = new WebSocket(`ws://${window.location.host}/ws`);
                const statusElement = document.getElementById('ws-status');
                
                ws.onopen = function(event) {
                    statusElement.textContent = 'Connected';
                    statusElement.style.color = 'green';
                };
                
                ws.onclose = function(event) {
                    statusElement.textContent = 'Disconnected';
                    statusElement.style.color = 'red';
                };
                
                ws.onerror = function(error) {
                    statusElement.textContent = 'Error';
                    statusElement.style.color = 'red';
                    console.error('WebSocket error:', error);
                };
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    client_id = str(uuid.uuid4())

    await manager.connect(websocket, client_id)

    # Store client info
    active_clients[client_id] = ClientInfo(
        client_id=client_id,
        connected_at=datetime.now().isoformat(),
        user_agent=websocket.headers.get("user-agent"),
        ip_address=websocket.client.host,
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                event = message.get("event")
                payload = message.get("data", {})

                log.debug(
                    "Received WebSocket message",
                    client_id=client_id,
                    event=event,
                )

                if event == "prompt:submit":
                    # Cancel any existing automation for this client
                    if client_id in active_automations and not active_automations[client_id].done():
                        active_automations[client_id].cancel()
                        await asyncio.sleep(0.5)  # Give it time to clean up

                    try:
                        # Parse request
                        request_data = {
                            "task": payload.get("prompt", ""),
                            "model_provider": payload.get("options", {}).get("modelProvider", "ollama"),
                            "model_name": payload.get("options", {}).get("model"),
                            "use_vision": payload.get("options", {}).get("useVision", True),
                            "headless": payload.get("options", {}).get("headless", True),
                            "browser_type": payload.get("options", {}).get("browserType", "chromium"),
                            "aws_region": payload.get("options", {}).get("awsRegion"),
                            "aws_profile": payload.get("options", {}).get("awsProfile"),
                        }

                        # Add API key from environment if using OpenAI
                        if request_data["model_provider"] == "openai":
                            request_data["api_key"] = os.environ.get("OPENAI_API_KEY")

                        request = AutomationRequest(**request_data)

                        # Start automation in background task
                        task = asyncio.create_task(run_automation(client_id, request))
                        active_automations[client_id] = task

                    except ValidationError as e:
                        log.error("Invalid request", client_id=client_id, error=str(e))
                        await manager.send_message(
                            client_id,
                            "automation:error",
                            {"message": f"Invalid request: {str(e)}"},
                        )

                elif event == "automation:stop":
                    # Stop automation if running
                    if client_id in active_automations and not active_automations[client_id].done():
                        active_automations[client_id].cancel()
                        log.info("Automation stopped by user", client_id=client_id)

            except json.JSONDecodeError:
                log.error("Invalid JSON received", client_id=client_id)
                await manager.send_message(
                    client_id,
                    "automation:error",
                    {"message": "Invalid JSON format"},
                )
            except Exception as e:
                log.exception("Error processing WebSocket message", client_id=client_id, error=str(e))
                await manager.send_message(
                    client_id,
                    "automation:error",
                    {"message": f"Server error: {str(e)}"},
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        # Cancel any running automation for this client
        if client_id in active_automations and not active_automations[client_id].done():
            active_automations[client_id].cancel()
        # Remove client info
        if client_id in active_clients:
            del active_clients[client_id]
    except Exception as e:
        log.exception("WebSocket error", client_id=client_id, error=str(e))
        manager.disconnect(client_id)
        # Clean up
        if client_id in active_automations and not active_automations[client_id].done():
            active_automations[client_id].cancel()
        if client_id in active_clients:
            del active_clients[client_id]


@app.get("/api/health", response_model=ServerStatus)
async def health_check():
    """Health check endpoint"""
    return ServerStatus(
        status="ok",
        version="0.1.0",
        uptime=time.time() - START_TIME,
        active_clients=len(active_clients),
        active_automations=len(active_automations),
    )


@app.get("/api/clients", response_model=List[ClientInfo])
async def get_clients():
    """Get all connected clients"""
    return list(active_clients.values())


# Mount static files if they exist
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "dist")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    log.info(f"Serving static files from {static_dir}")


def main():
    """Run the server"""
    port = int(os.environ.get("PORT", 3001))
    log.info(f"Starting server on port {port}")
    
    # Configure CORS and WebSocket settings
    uvicorn.run(
        "browser_automation_agent.server:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        log_level="info",
        ws_ping_interval=20,
        ws_ping_timeout=30,
        ws_max_size=16777216  # 16MB
    )


if __name__ == "__main__":
    main()
