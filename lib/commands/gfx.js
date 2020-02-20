// Part of <https://miracle.systems/p/node-goldelox> licensed under <MIT>

'use strict';

exports.bgColor = function(color)
{
  return this.requestWithWords(0xFF6E, [color]);
};

exports.changeColor = function({oldColor, newColor})
{

};

exports.circle = function({x, y, radius, color})
{
  return this.requestWithWords(0xFFCD, [x, y, radius, color]);
};

exports.circleFilled = function({x, y, radius, color})
{
  return this.requestWithWords(0xFFCC, [x, y, radius, color]);
};

exports.clipping = function(state)
{

};

exports.clipWindow = function({x1, y1, x2, y2})
{

};

exports.cls = function()
{
  return this.requestWithWords(0xFFD7, []);
};

exports.contrast = function(contrast)
{

};

exports.frameDelay = function(msec)
{

};

exports.getPixel = function({x, y})
{
  return this.requestWithWords(0xFFCA, [x, y], (responseFrame) =>
  {
    if (responseFrame.length < 3)
    {
      return;
    }

    if (responseFrame.length !== 3 || responseFrame[0] !== 0x06)
    {
      return new Error(`Invalid response. Expected ACK (0x06) + color.`);
    }

    return {
      color: responseFrame.readUInt16BE(1)
    };
  });
};

exports.line = function({x1, y1, x2, y2, color})
{
  return this.requestWithWords(0xFFD2, [x1, y1, x2, y2, color]);
};

exports.linePattern = function(pattern)
{

};

exports.lineTo = function({x, y})
{

};

exports.moveTo = function({x, y})
{
  return this.requestWithWords(0xFFD6, [x, y]);
};

exports.orbit = function({angle, distance})
{

};

exports.outlineColor = function(color)
{

};

exports.polygon = function({x, y, color})
{

};

exports.polyline = function({x, y, color})
{

};

exports.putPixel = function({x, y, color})
{

};

exports.rectangle = function({x1, y1, x2, y2, color})
{
  return this.requestWithWords(0xFFCF, [x1, y1, x2, y2, color]);
};

exports.rectangleFilled = function({x1, y1, x2, y2, color})
{
  return this.requestWithWords(0xFFCE, [x1, y1, x2, y2, color]);
};

exports.screenMode = function(screenMode)
{

};

exports.set = function({func, value})
{

};

exports.setClipRegion = function()
{

};

exports.transparency = function(state)
{

};

exports.transparentColor = function(color)
{

};

exports.triangle = function({x1, y1, x2, y2, x3, y3, color})
{
  return this.requestWithWords(0xFFC9, [x1, y1, x2, y2, x3, y3, color]);
};
