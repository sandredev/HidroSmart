import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const file = '.env'
let content = existsSync(file) ? readFileSync(file, 'utf8') : ''
const values = {
  HIDROSMART_API_URL: 'http://127.0.0.1:8787/functions/v1',
  HIDROSMART_API_KEY: randomBytes(24).toString('hex'),
  HIDROSMART_DEVICE_TOKEN: randomBytes(24).toString('hex'),
}
for (const [name, value] of Object.entries(values)) {
  if (new RegExp('^' + name + '=.+', 'm').test(content)) continue
  const pattern = new RegExp('^' + name + '=.*$', 'm')
  if (pattern.test(content)) content = content.replace(pattern, name + '=' + value)
  else content = content.trimEnd() + '\n' + name + '=' + value + '\n'
}
writeFileSync(file, content)
chmodSync(file, 0o600)
console.log('Configuración local guardada en .env. Las credenciales existentes se conservan.')
