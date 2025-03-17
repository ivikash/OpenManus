import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Create a temporary directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-use-test-'));
console.log(`Created temp directory: ${tempDir}`);

// Create a simple Python script
const scriptPath = path.join(tempDir, 'test.py');
const scriptContent = `
import sys
import json
import os

print(json.dumps({
    "type": "system",
    "message": "Python script started"
}))
sys.stdout.flush()

print(json.dumps({
    "type": "system",
    "message": f"Python version: {sys.version}"
}))
sys.stdout.flush()

print(json.dumps({
    "type": "system",
    "message": f"Current working directory: {os.getcwd()}"
}))
sys.stdout.flush()

print(json.dumps({
    "type": "system",
    "message": "Script completed successfully"
}))
sys.stdout.flush()
`;

fs.writeFileSync(scriptPath, scriptContent);
console.log(`Created test script at: ${scriptPath}`);

// Run the Python script
console.log('Starting Python process...');
const pythonPath = '/Users/vikasagr/.pyenv/shims/python';
const pythonProcess = spawn(pythonPath, [scriptPath]);

pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`Python stdout: ${output}`);
    
    try {
        const jsonData = JSON.parse(output);
        console.log(`Parsed JSON: ${JSON.stringify(jsonData)}`);
    } catch (e) {
        console.log(`Not JSON: ${e.message}`);
    }
});

pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data.toString().trim()}`);
});

pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
});
