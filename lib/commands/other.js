// Part of <https://miracle.systems/p/node-goldelox> licensed under <MIT>

'use strict';

exports.putstr = function(ascii)
{
  ascii = ascii.replace(/[^ -~]+/g, '');

  const frame = Buffer.allocUnsafe(2 + ascii.length + 1);

  frame[0] = 0x00;
  frame[1] = 0x06;
  frame.asciiWrite(ascii, 2);
  frame[frame.length - 1] = 0;

  return this.request(frame, this.handleAckResponse);
};
