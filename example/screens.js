// Part of <https://miracle.systems/p/node-goldelox> licensed under <MIT>

'use strict';

const SerialPort = require('serialport');
const {Commander, colors} = require('../');

const LOG_RXTX = false;
const SCREENS = [
  drawStepScreen
  , drawStepScreen
  , drawStepScreen
  , drawStepScreen
  , drawStepScreen
  , drawErrorScreen
  , drawSuccessScreen
  , drawMessageScreen
  , drawTeardownScreen
];
const PORTS = ['A', 'B', 'C', 'D', 'E', 'SR', 'BRN', 'COM', 'ORG']
const WIRE_COLORS = [
  'red',
  'orange',
  'green',
  'yellow',
  'white',
  'blue-orange',
  'orange-orange',
  'green-yellow-red-white',
  'lorem-ipsum-dolor-sit-amet-consectetur',
];

let currentScreenI = 0;
let serialPort = null;
let cmd = null;
let drawTimer = null;

main();

async function main()
{
  let path;
  let baudRate;

  process.argv.forEach((arg, i) =>
  {
    if (arg === '--port')
    {
      path = process.argv[i + 1];
    }
    else if (arg === '--speed')
    {
      baudRate = +process.argv[i + 1];
    }
  });

  if (!path)
  {
    const ports = await SerialPort.list();

    if (ports.length === 0)
    {
      return console.error('No serial ports found!');
    }

    const port = ports.find(p => p.vendorId === '10C4');

    if (!port)
    {
      return console.error('No valid serial port found!', ports);
    }

    path = port.path;
  }

  serialPort = new SerialPort(path, {
    baudRate: baudRate || 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    autoOpen: false
  });

  serialPort.on('error', err => console.error(`Serial port error: ${err.message}`));

  cmd = new Commander(serialPort);

  cmd.on('open', () => console.log('open'));
  cmd.on('close', () => console.log('close'));
  cmd.on('readyCheck', () => console.log('readyCheck'));
  cmd.on('notReady', (err) => console.log('notReady:', err.message));
  cmd.on('resetting', () => console.log('resetting'));
  cmd.on('reset', () => console.log('reset'));
  cmd.on('ready', () => console.log('ready'));

  if (LOG_RXTX)
  {
    cmd.on('tx', (data) => console.log('tx', data));
    cmd.on('rx', (data) => console.log('rx', data));
  }

  cmd.once('ready', drawScreen);

  serialPort.open();

  setTimeout(shutdown, 30000);
}

function shutdown()
{
  clearTimeout(drawTimer);
  serialPort.close();
  cmd.destroy();
}

function rand(min, max)
{
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min)) + min;
}

async function drawStepScreen()
{
  await cmd.gfx.bgColor(colors.BLACK);
  await cmd.txt.fgColor(colors.WHITE);
  await cmd.gfx.cls();

  await cmd.gfx.moveTo({x: 4, y: 4});
  const step = rand(1, 30);
  const length = rand(1, 9999);
  const hd = `Step ${step}`;
  await cmd.putstr(`${hd}${length.toString().padStart(15 - hd.length, ' ')}mm`);

  /*
  await cmd.gfx.moveTo({x: 4, y: 29});
  await cmd.putstr(`od`);

  await cmd.gfx.moveTo({x: 4, y: 61});
  await cmd.putstr(`do`);
  */

  await cmd.gfx.circleFilled({x: 11, y: 32, radius: 7, color: colors.WHITE});
  await cmd.gfx.circleFilled({x: 11, y: 64, radius: 7, color: colors.WHITE});

  const parts = WIRE_COLORS[rand(0, WIRE_COLORS.length)].split('-');
  const lines = [parts.shift()];

  while (parts.length)
  {
    const part = parts.shift();

    if (lines[lines.length - 1].length + 1 + part.length > 17)
    {
      lines.push(part);
    }
    else
    {
      lines[lines.length - 1] += `-${part}`;
    }
  }

  for (let i = 0; i < lines.length; ++i)
  {
    await cmd.gfx.moveTo({x: 4, y: 86 + 16 * i});
    await cmd.putstr(lines[i]);
  }

  await cmd.txt.width(3);
  await cmd.txt.height(3);
  await cmd.gfx.moveTo({x: 22, y: 22});
  await cmd.putstr(`${PORTS[rand(0, PORTS.length)]}${rand(1, 12)}`);
  await cmd.gfx.moveTo({x: 22, y: 54});
  await cmd.putstr(`${PORTS[rand(0, PORTS.length)]}${rand(1, 12)}`);
}

async function drawErrorScreen()
{
  await cmd.gfx.bgColor(colors.hex('#EE0000'));
  await cmd.gfx.cls();
  await cmd.txt.fgColor(colors.WHITE);
  await cmd.txt.width(3);
  await cmd.txt.height(3);
  await cmd.txt.opacity(false);
  await cmd.gfx.moveTo({x: 32, y: 52});
  await cmd.putstr('NOK');
}

async function drawSuccessScreen()
{
  await cmd.gfx.bgColor(colors.hex('#00E600'));
  await cmd.gfx.cls();
  await cmd.txt.fgColor(colors.WHITE);
  await cmd.txt.width(3);
  await cmd.txt.height(3);
  await cmd.txt.opacity(false);
  await cmd.gfx.moveTo({x: 42, y: 52});
  await cmd.putstr('OK');
}

async function drawMessageScreen()
{
  await cmd.gfx.bgColor(colors.BLACK);
  await cmd.gfx.cls();
  await cmd.txt.fgColor(colors.WHITE);
  await cmd.txt.width(3);
  await cmd.txt.height(3);
  await cmd.txt.opacity(false);
  await cmd.gfx.moveTo({x: 32, y: 52});
  await cmd.putstr('???');
}

async function drawTeardownScreen()
{
  await cmd.gfx.bgColor(colors.hex('#EEAA00'));
  await cmd.gfx.cls();
  await cmd.txt.fgColor(colors.WHITE);
  await cmd.txt.width(3);
  await cmd.txt.height(3);
  await cmd.txt.opacity(false);
  await cmd.gfx.moveTo({x: 35, y: 45});
  await cmd.putstr('...');
}

async function drawScreen()
{
  const screen = SCREENS[currentScreenI++];

  if (currentScreenI === SCREENS.length)
  {
    currentScreenI = 0;
  }

  try
  {
    await screen();
  }
  catch (err)
  {
    console.error(`Failed to draw screen: ${err.stack}`);
  }

  drawTimer = setTimeout(drawScreen, 1000);
}
