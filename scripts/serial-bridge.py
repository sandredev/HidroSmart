"""Puente de pruebas local: firmware bomba_local -> API existente. Una sola instancia."""
import datetime
import json
import os
import re
import signal
import sqlite3
import time
import urllib.request
import urllib.parse
import serial

base = os.environ.get('HIDROSMART_API_URL', '').rstrip('/')
parsed = urllib.parse.urlparse(base)
if parsed.hostname not in ('127.0.0.1', 'localhost'):
    raise SystemExit('El puente de pruebas requiere HIDROSMART_API_URL en localhost.')
device = os.environ.get('HIDROSMART_DEVICE_ID', 'esp8266-cultivo-01')
headers = {'apikey': os.environ['HIDROSMART_API_KEY'],
           'x-device-token': os.environ['HIDROSMART_DEVICE_TOKEN'], 'Content-Type': 'application/json'}

def call(route, body=None):
    req = urllib.request.Request(base + '/' + route, headers=headers,
        data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=2) as response:
        result = json.load(response)
    if not result.get('ok'):
        raise RuntimeError('API rechazó ' + route)
    return result['data']

def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

os.makedirs('data', exist_ok=True)
db = sqlite3.connect('data/serial-bridge.sqlite')
db.execute('CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, result TEXT NOT NULL)')
port = serial.Serial(os.environ.get('HIDROSMART_SERIAL_PORT', '/dev/ttyUSB0'), 115200, timeout=.1)
port.dtr = False
port.rts = False
time.sleep(2)
# Cancelar cualquier ciclo previo y vaciar solicitudes antiguas antes de admitir nuevas.
port.write(b'\ndetener\n')
pending = None
last_sample = 0
last_poll = 0
last_report = 0
running = True
observed = None
event = None

def stop(*_):
    global running
    running = False
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)

def ack(command, result):
    db.execute('INSERT INTO commands VALUES (?,?) ON CONFLICT(id) DO UPDATE SET result=excluded.result', (command['id'], result))
    db.commit()
    call('actualizar-estado-comando', {'comando_id': command['id'], 'estado': result})

print('Puente USB iniciado. Solo riego manual, pulsos de 5 s. Sin automatismo por humedad.', flush=True)
try:
    while running:
        line = port.readline().decode('utf8', errors='ignore').strip()
        now = time.monotonic()
        match = re.fullmatch(r'A0=(\d+) humedad relativa=([\d.]+) valida=([01]) bomba=([01])', line)
        try:
            if match:
                raw, humidity, valid, active = match.groups()
                active = active == '1'
                last_sample = now
                if active and observed is False:
                    event = call('registrar-evento-riego', {'accion': 'inicio', 'motivo': 'manual',
                        'fecha': stamp(), 'humedad': float(humidity)})
                    event['monotonic_start'] = now
                elif not active and observed is True and event:
                    call('registrar-evento-riego', {'accion': 'fin', 'evento_id': event['evento_id'],
                        'fecha': stamp(), 'humedad': float(humidity), 'duracion_segundos': round(now - event['monotonic_start'], 2)})
                    event = None
                if observed != active or now - last_report >= 3:
                    call('actualizar-estado-dispositivo', {'dispositivo_id': device, 'bomba_activa': active})
                    last_report = now
                    print('Salida reportada por firmware:', 'activa' if active else 'apagada', flush=True)
                observed = active
                if now - getattr(call, 'measurement_at', 0) >= 5:
                    call('registrar-medicion', {'dispositivo_id': device, 'humedad': float(humidity),
                        'valor_original': int(raw), 'tipo_lectura': 'calibrada', 'valida': valid == '1', 'fecha_medicion': stamp()})
                    call.measurement_at = now
            if pending:
                accepted = line == 'Riego aprobado: 5 s.' if pending['accion'] == 'iniciar' else line == 'Bomba apagada.'
                rejected = line.startswith('Inicio rechazado:')
                if accepted or rejected:
                    ack(pending, 'ejecutada' if accepted else 'rechazada')
                    pending = None
                elif now - pending['sent_at'] > 3:
                    port.write(b'detener\n')
                    ack(pending, 'rechazada')
                    pending = None
            if now - last_poll >= .5 and not pending and now - last_sample < 3:
                last_poll = now
                command = call('obtener-comando-pendiente').get('comando')
                if command:
                    previous = db.execute('SELECT result FROM commands WHERE id=?', (command['id'],)).fetchone()
                    if previous:
                        ack(command, previous[0])
                    elif time.time() >= datetime.datetime.fromisoformat(command['expira_en'].replace('Z', '+00:00')).timestamp():
                        ack(command, 'rechazada')
                    else:
                        # Registrar antes de actuar: un reinicio nunca repite un encendido incierto.
                        db.execute('INSERT INTO commands VALUES (?,?)', (command['id'], 'rechazada'))
                        db.commit()
                        pending = {**command, 'sent_at': now}
                        port.write((command['accion'] + '\n').encode())
                        print('Orden USB enviada:', command['accion'], flush=True)
            if last_sample and now - last_sample > 3:
                port.write(b'detener\n')
                raise RuntimeError('Telemetría USB interrumpida; se solicitó parada.')
        except Exception as error:
            port.write(b'detener\n')
            print('Error del puente:', type(error).__name__, str(error)[:160], flush=True)
            running = False
finally:
    port.write(b'detener\n')
    port.flush()
    port.close()
    db.close()
