/**
 * Spawn a Node.js script as a subprocess, pipe stdin, collect stdout/stderr.
 *
 * @param {string} scriptPath - Absolute path to the .mjs script
 * @param {object} opts
 * @param {string}  [opts.stdin]  - Text to pipe to stdin
 * @param {object}  [opts.env]    - Extra env vars (merged with process.env)
 * @param {string[]} [opts.args]  - Additional CLI args
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
export async function run(scriptPath, { stdin = '', env = {}, args = [] } = {}) {
  const { spawn } = await import('node:child_process');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--no-warnings', scriptPath, ...args], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.on('error', reject);
    child.on('close', exitCode => resolve({ stdout, stderr, exitCode }));
  });
}
