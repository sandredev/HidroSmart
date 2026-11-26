import { loadEnv } from 'vite'
import { spawn } from 'node:child_process'
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const child = spawn(env.HIDROSMART_SERIAL_PYTHON || '/tmp/hidrosmart-pio/bin/python', ['scripts/serial-bridge.py'], { env, stdio: 'inherit' })
child.on('error', () => { console.error('No se pudo iniciar Python con pyserial. Configura HIDROSMART_SERIAL_PYTHON.'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
