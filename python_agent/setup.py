from setuptools import setup, find_packages

setup(
    name="browser_automation_agent",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "browser-use>=0.1.40",
        "langchain-ollama>=0.0.1",
        "langchain-openai>=0.0.1",
        "langchain-bedrock>=0.0.1",
        "boto3>=1.28.0",
        "pillow>=9.0.0",
        "python-dotenv>=0.19.0",
        "fastapi>=0.104.0",
        "uvicorn>=0.23.2",
        "websockets>=11.0.3",
        "python-multipart>=0.0.6",
        "pydantic>=2.4.2",
        "ruff>=0.1.0",
    ],
    entry_points={
        "console_scripts": [
            "browser-agent=browser_automation_agent.cli:main",
            "browser-agent-server=browser_automation_agent.server:main",
        ],
    },
    python_requires=">=3.9",
    author="OpenManus Team",
    description="Browser automation agent for OpenManus",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
