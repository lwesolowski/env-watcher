const { spawn } = require('child_process');

const server = spawn('node', ['mcp-servers/10x/node_modules/@przeprogramowani/10x-mvp-tracker/dist/index.js']);

let output = '';

const callTool = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
        name: 'check-mvp',
        arguments: {
            projectPath: process.cwd()
        }
    }
};

server.stdout.on('data', (data) => {
    output += data.toString();
    const lines = output.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
            try {
                const response = JSON.parse(line);
                if (response.id === 1) {
                    console.log(JSON.stringify(response, null, 2));
                    server.kill();
                    process.exit(0);
                }
            } catch (e) {
                // Ignore non-JSON or partial JSON
            }
        }
    }
    output = lines[lines.length - 1];
});

server.stdin.write(JSON.stringify(callTool) + '\n');

setTimeout(() => {
    console.error('Timeout');
    server.kill();
    process.exit(1);
}, 10000);
