#!/usr/bin/env node
/**
 * Starts the Vite dev server from the repository root.
 *
 * Usage:
 *   npm run dev             # app
 *   npm run dev:frontend    # app
 *   npm run dev:backend     # no separate server is needed
 *
 * The app ships with its own browser-backed API, so PHP and Composer are not
 * required. If port 3000 is busy, the launcher moves to the next free port.
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

const target = process.argv[2] ?? "all";

if (!["all", "frontend", "backend"].includes(target)) {
    console.error(`Unknown target "${target}". Use "frontend", "backend" or no argument.`);
    process.exit(1);
}

if (target === "backend") {
    console.log("The ROG API runs inside the front-end; there is no separate backend to start.");
    process.exit(0);
}

const DEFAULT_FRONTEND_PORT = 3000;
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
    console.error("Stop a process or set FRONTEND_PORT to a different port.");
    process.exit(1);
}

const frontendPort = await pickPort(startFrontendPort, "Vite");
const frontendOrigin = `http://localhost:${frontendPort}`;

const children = [];
let shuttingDown = false;

function stop(child) {
    if (!child || child.exitCode !== null) return;

    if (process.platform === "win32" && child.pid) {
        // Vite starts its own children, so end the whole tree.
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

const viteBinary = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

console.log("Starting ROG development environment...");
console.log(`  App:  ${frontendOrigin}/login`);
console.log("  API:  built into the app (no local server needed)");
if (frontendPort !== startFrontendPort) {
    console.log(`  note: port ${startFrontendPort} is busy, the app uses ${frontendPort} instead.`);
}
console.log("Press Ctrl+C to stop everything.");

run(
    "web",
    process.execPath,
    [viteBinary, "--strictPort", "--port", String(frontendPort)],
    frontendDir,
    36,
    { ...process.env },
);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGHUP", () => shutdown(0));
