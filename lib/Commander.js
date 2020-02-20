// Part of <https://miracle.systems/p/node-goldelox> licensed under <MIT>

'use strict';

const {EventEmitter} = require('events');
const gfx = require('./commands/gfx');
const txt = require('./commands/txt');
const media = require('./commands/media');
const other = require('./commands/other');

const ACK = 0x06;
const NAK = 0x15;
const RESPONSE_TIMEOUT = 100;
const CHECKING_RESPONSE_TIMEOUT = 1000;
const READY_STATE = {
  NOT_READY: 0,
  CHECKING: 1,
  READY: 2,
  DESTROYED: 3
};

module.exports = class Commander extends EventEmitter
{
  constructor(serialPort)
  {
    super();

    this.gfx = {};
    this.txt = {};
    this.media = {};

    Object.keys(gfx).forEach(cmd => this.gfx[cmd] = gfx[cmd].bind(this));
    Object.keys(txt).forEach(cmd => this.txt[cmd] = txt[cmd].bind(this));
    Object.keys(media).forEach(cmd => this.media[cmd] = media[cmd].bind(this));
    Object.keys(other).forEach(cmd => this[cmd] = other[cmd].bind(this));

    this.serialPort = serialPort;
    this.readyState = READY_STATE.NOT_READY;
    this.readyQueue = [];
    this.requestQueue = [];
    this.currentRequest = null;
    this.responseFrame = null;
    this.timers = {};

    serialPort.on('open', this.onOpen);
    serialPort.on('close', this.onClose);
    serialPort.on('readable', this.onReadable);

    if (serialPort.isOpen)
    {
      this.onOpen();
    }
  }

  destroy()
  {
    this.readyState = READY_STATE.DESTROYED;

    if (this.currentRequest)
    {
      clearTimeout(this.currentRequest.timeoutTimer);
      this.currentRequest = null;
    }

    [...this.readyQueue, ...this.requestQueue].forEach(req =>
    {
      req.reject(new Error('Destroyed.'));
    });

    this.readyQueue = [];
    this.requestQueue = [];

    this.serialPort.removeListener('open', this.onOpen);
    this.serialPort.removeListener('close', this.onClose);
    this.serialPort.removeListener('readable', this.onReadable);
    this.serialPort = null;

    Object.keys(this.timers).forEach(k => clearTimeout(this.timers[k]));

    this.removeAllListeners();
  }

  ready(timeout = 0)
  {
    return new Promise((resolve, reject) =>
    {
      if (this.readyState === READY_STATE.READY)
      {
        return resolve();
      }

      if (timeout)
      {
        this.timers.ready = setTimeout(() => reject('Ready timeout.'), timeout);
      }

      const onReady = () =>
      {
        clearTimeout(this.timers.ready);
        this.timers.ready = null;

        resolve();
      };

      this.once('ready', onReady);
    });
  }

  onOpen = () =>
  {
    this.emit('open');

    clearTimeout(this.timers.checkReadiness);
    clearTimeout(this.timers.markAsReady);

    this.checkReadiness();
  }

  async checkReadiness()
  {
    this.readyState = READY_STATE.CHECKING;

    this.emit('readyCheck');

    try
    {
      const responseHandler = res =>
      {
        if (res.length === 1 && res[0] === ACK)
        {
          return 1;
        }

        if (res.length === 1 && res[0] === NAK)
        {
          return 0;
        }
      };
      const result = await this.request(Buffer.from([0xFF, 0xE4, 0, 0, 0, 0]), responseHandler, true);

      if (result === 1)
      {
        this.markAsReady();
      }
      else
      {
        this.reset();
      }
    }
    catch (err)
    {
      this.emit('notReady', err);

      this.timers.checkReadiness = setTimeout(this.checkReadiness.bind(this), 1000, false);
    }
  }

  async reset()
  {
    this.emit('resetting');

    try
    {
      await this.request(Buffer.from([0x00]), () => {}, true);
    }
    catch (err)
    {
      this.emit('reset');

      if (err.responseFrame)
      {
        let nak = true;

        for (let i = 0; i < err.responseFrame.length; ++i)
        {
          nak = nak && err.responseFrame[i] === NAK;
        }

        if (nak)
        {
          this.markAsReady();

          return;
        }
      }

      this.emit('notReady', err);

      this.timers.checkReadiness = setTimeout(this.checkReadiness.bind(this), 1000, false);
    }
  }

  markAsReady()
  {
    this.readyState = READY_STATE.READY;
    this.requestQueue = this.readyQueue;
    this.readyQueue = [];

    this.emit('ready');

    this.sendNextRequest();
  }

  onClose = () =>
  {
    this.readyState = READY_STATE.NOT_READY;

    this.emit('close');
  }

  onReadable = () =>
  {
    if (!this.currentRequest)
    {
      return;
    }

    const totalData = [];
    let totalLength = 0;
    let data = null;

    if (this.responseFrame)
    {
      totalData.push(this.responseFrame);
      totalLength += this.responseFrame.length;
    }

    while ((data = this.serialPort.read()) !== null)
    {
      this.emit('rx', data);

      totalData.push(data);
      totalLength += data.length;
    }

    if (totalLength > 0)
    {
      this.responseFrame = Buffer.concat(totalData, totalLength);

      this.handleResponseFrame();
    }
  }

  handleResponseFrame()
  {
    if (!this.currentRequest)
    {
      return;
    }

    const res = this.currentRequest.responseHandler(this.responseFrame);

    if (res === undefined)
    {
      return;
    }

    if (res instanceof Error)
    {
      this.handleResponse(res);
    }
    else
    {
      this.handleResponse(null, res);
    }
  }

  handleResponse(err, res)
  {
    const req = this.currentRequest;

    if (err && this.responseFrame)
    {
      err.responseFrame = this.responseFrame;
    }

    this.currentRequest = null;
    this.responseFrame = null;

    clearTimeout(req.timeoutTimer);

    if (err)
    {
      req.reject(err);
    }
    else
    {
      req.resolve(res);
    }

    if (this.requestQueue.length)
    {
      this.sendNextRequest();
    }
    else
    {
      this.timers.keepAlive = setTimeout(this.keepAlive.bind(this), 1337);
    }
  }

  handleAckResponse = (responseFrame) =>
  {
    if (responseFrame.length !== 1 || responseFrame[0] !== 0x06)
    {
      return new Error(`Invalid response. Expected ACK (0x06).`);
    }

    return {};
  }

  request(requestFrame, responseHandler, checkingReadiness = false)
  {
    if (this.readyState === READY_STATE.DESTROYED)
    {
      return new Promise((resolve, reject) => reject(new Error('Destroyed.')));
    }

    if (!this.serialPort.isOpen)
    {
      return new Promise((resolve, reject) => reject(new Error('No connection.')));
    }

    clearTimeout(this.timers.keepAlive);

    const req = {
      requestFrame,
      responseHandler,
      timeoutTimer: null,
      resolve: null,
      reject: null
    };

    if (checkingReadiness || this.readyState === READY_STATE.READY)
    {
      this.requestQueue.push(req);
    }
    else
    {
      this.readyQueue.push(req);
    }

    this.sendNextRequest();

    return new Promise((resolve, reject) =>
    {
      req.resolve = resolve;
      req.reject = reject;
    });
  }

  requestWithWords(cmd, words, responseHandler)
  {
    const requestFrame = Buffer.allocUnsafe(2 + words.length * 2);

    requestFrame.writeUInt16BE(cmd, 0);

    words.forEach((word, i) =>
    {
      requestFrame.writeUInt16BE(word, 2 + i * 2);
    });

    return this.request(requestFrame, responseHandler || this.handleAckResponse);
  }

  sendNextRequest()
  {
    if (this.currentRequest)
    {
      return;
    }

    if (!this.requestQueue.length)
    {
      return;
    }

    this.currentRequest = this.requestQueue.shift();
    this.currentRequest.timeoutTimer = setTimeout(
      () => this.handleResponse(new Error('Response timeout.')),
      this.readyState === READY_STATE.CHECKING ? CHECKING_RESPONSE_TIMEOUT : RESPONSE_TIMEOUT
    );

    this.serialPort.write(this.currentRequest.requestFrame);

    this.emit('tx', this.currentRequest.requestFrame);
  }

  keepAlive()
  {
    this.gfx.getPixel({x: 0, y: 0}).then(() => {}, () => {});
  }
}
