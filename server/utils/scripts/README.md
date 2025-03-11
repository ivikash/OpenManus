# Debugging Scripts

This directory contains utility scripts for debugging and testing the browser-use integration.

## Available Scripts

- `debug-browser-use.js` - Tests the browser-use Python library integration
- `debug-script.js` - Simple Python script execution test

## Usage

These scripts are meant for development and debugging purposes only. They should not be used in production.

To run a script:

```bash
node server/utils/scripts/debug-browser-use.js
```

## Notes

- These scripts create temporary files in the system's temp directory
- They test the Python environment and browser-use library functionality
- They help diagnose issues with the Python process execution and output parsing