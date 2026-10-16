const { spawn } = require('node:child_process');
const path = require('node:path');

async function startServer(directory = path.resolve(__dirname, '../..')) {
  const server = spawn(process.env.PYTHON || 'python3', ['-B', '-u', '-c',
    "from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer;s=ThreadingHTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler);print(s.server_port,flush=True);s.serve_forever()"],
    { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
  const stop = async () => {
    if (!server.pid || server.exitCode !== null || server.signalCode !== null) return;
    await new Promise(resolve => {
      const timeout = setTimeout(() => { server.kill('SIGKILL'); }, 2000);
      server.once('exit', () => { clearTimeout(timeout); resolve(); });
      server.kill('SIGTERM');
    });
  };
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '', errors = '';
      const timeout = setTimeout(() => reject(new Error(`Local preview startup timed out. ${errors}`)), 5000);
      const finish = (error, value) => {
        clearTimeout(timeout);
        if (error) reject(error); else resolve(value);
      };
      server.stderr.on('data', chunk => { errors = (errors + chunk).slice(-2000); });
      server.stdout.on('data', chunk => {
        output += chunk;
        if (!output.includes('\n')) return;
        const value = Number(output.split('\n')[0]);
        if (Number.isInteger(value) && value > 0 && value <= 65535) finish(null, value);
        else finish(new Error('Local preview returned an invalid port.'));
      });
      server.once('error', error => finish(error));
      server.once('exit', code => finish(new Error(`Local preview exited (${code}). ${errors}`)));
    });
    return { origin: `http://127.0.0.1:${port}`, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
module.exports = { startServer };
