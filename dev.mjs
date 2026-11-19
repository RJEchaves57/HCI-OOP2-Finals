#!/usr/bin/env node
/**
 * Starts the Laravel API and the Vite dev server from the repository root.
 *
 * Usage:
 *   npm run dev             # both servers
 *   npm run dev:backend     # API only
 *   npm run dev:frontend    # app only
 *
 * Ports default to 3000 (app) and 8000 (API). If one is already taken by
 * another program the launcher moves to the next free port and keeps the two
 * servers in sync (FRONTEND_URL for CORS, VITE_API_URL for the app), so a
 * stale or unrelated process does not block `npm run dev`.
 *
 * Override the starting ports with FRONTEND_PORT / API_PORT if needed.
 *
 * Node's spawn is used instead of shell shims so the "&" in the project path
 * does not break command lookup on Windows.
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");

const target = process.argv[2] ?? "all";

if (!["all", "frontend", "backend"].includes(target)) {
    console.error(`Unknown target "${target}". Use "frontend", "backend" or no argument.`);
    process.exit(1);
}

const usesBackend = target !== "frontend";
const usesFrontend = target !== "backend";

const DEFAULT_FRONTEND_PORT = 3000;
const DEFAULT_API_PORT = 8000;
const PORT_SCAN_LIMIT = 20;

function preferredPort(value, fallback, name) {
    const port = Number(value ?? fallback);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error(`Invalid ${name} "${value}". Use a port between 1 and 65535.`);
        process.exit(1);
    }

    return port;
}

const startFrontendPort = preferredPort(process.env.FRONTEND_PORT, DEFAULT_FRONTEND_PORT, "FRONTEND_PORT");
const startApiPort = preferredPort(process.env.API_PORT, DEFAULT_API_PORT, "API_PORT");

function isPortInUse(port) {
    const probe = (host) =>
        new Promise((resolve) => {
            const socket = net.connect({ port, host });
            const finish = (inUse) => {
                socket.destroy();
                resolve(inUse);
            };

            socket.setTimeout(700);
            socket.once("connect", () => finish(true));
            socket.once("timeout", () => finish(false));
            socket.once("error", () => finish(false));
        });

    return Promise.all([probe("127.0.0.1"), probe("::1")]).then((results) => results.some(Boolean));
}

async function pickPort(start, label) {
    for (let port = start; port < start + PORT_SCAN_LIMIT; port += 1) {
        if (!(await isPortInUse(port))) return port;
    }

    console.error(`Cannot start: no free port for ${label} in ${start}-${start + PORT_SCAN_LIMIT - 1}.`);
    console.error("Stop a process or set FRONTEND_PORT / API_PORT to a different port.");
    process.exit(1);
}

const frontendPort = usesFrontend ? await pickPort(startFrontendPort, "Vite") : startFrontendPort;
const apiPort = usesBackend ? await pickPort(startApiPort, "Laravel") : startApiPort;

const frontendOrigin = `http://localhost:${frontendPort}`;
const apiOrigin = `http://localhost:${apiPort}`;

const children = [];
let shuttingDown = false;

function stop(child) {
    if (!child || child.exitCode !== null) return;

    if (process.platform === "win32" && child.pid) {
        // Vite and `artisan serve` start their own children, so end the whole tree.
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
        child.kill("SIGTERM");
    }
}

function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    children.forEach(stop);
    setTimeout(() => process.exit(exitCode), 500).unref();
}

function run(label, command, args, cwd, color, env = process.env) {
    const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
    });

    const prefix = `\u001b[${color}m[${label}]\u001b[0m `;

    createInterface({ input: child.stdout }).on("line", (line) => console.log(prefix + line));
    createInterface({ input: child.stderr }).on("line", (line) => console.error(prefix + line));

    child.on("error", (error) => {
        console.error(`${prefix}failed to start: ${error.message}`);
        shutdown(1);
    });

    child.on("exit", (code) => {
        if (shuttingDown) return;
        console.error(`${prefix}exited with code ${code ?? "unknown"}.`);
        shutdown(code ?? 1);
    });

    children.push(child);
    return child;
}

const phpBinary = process.env.PHP_BINARY || (process.platform === "win32" ? "php.exe" : "php");
const viteBinary = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

console.log("Starting ROG development environment...");
if (usesBackend) console.log(`  API:  ${apiOrigin}/api`);
if (usesFrontend) console.log(`  App:  ${frontendOrigin}/login`);
if (usesFrontend && frontendPort !== startFrontendPort) {
    console.log(`  note: port ${startFrontendPort} is busy, the app uses ${frontendPort} instead.`);
}
if (usesBackend && apiPort !== startApiPort) {
    console.log(`  note: port ${startApiPort} is busy, the API uses ${apiPort} instead.`);
}
if (!usesBackend && frontendPort !== startFrontendPort) {
    console.log(
        `  note: an API started elsewhere only allows its own FRONTEND_URL; restart it with FRONTEND_URL=${frontendOrigin} if requests are blocked.`,
    );
}
console.log("Press Ctrl+C to stop everything.");

if (usesBackend) {
    run(
        "api",
        phpBinary,
        ["artisan", "serve", "--host=127.0.0.1", `--port=${apiPort}`],
        backendDir,
        35,
        usesFrontend ? { ...process.env, FRONTEND_URL: frontendOrigin } : process.env,
    );
}

if (usesFrontend) {
    const webEnv = { ...process.env };

    // Keep the app pointed at the API that this launcher actually started.
    if (usesBackend && apiPort !== DEFAULT_API_PORT && !process.env.VITE_API_URL) {
        webEnv.VITE_API_URL = `${apiOrigin}/api`;
    }

    run(
        "web",
        process.execPath,
        [viteBinary, "--strictPort", "--port", String(frontendPort)],
        frontendDir,
        36,
        webEnv,
    );
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGHUP", () => shutdown(0));
