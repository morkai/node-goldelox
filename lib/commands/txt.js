// Part of <https://miracle.systems/p/node-goldelox> licensed under <MIT>

'use strict';

exports.attributes = function({bold, italic, inverse, underlined})
{
  let attrs = 0;

  if (bold)
  {
    attrs |= 16;
  }

  if (italic)
  {
    attrs |= 32;
  }

  if (inverse)
  {
    attrs |= 64;
  }

  if (underlined)
  {
    attrs |= 128;
  }

  return this.requestWithWords(0xFF72, [attrs]);
};

exports.bgColor = function(color)
{
  return this.requestWithWords(0xFF7E, [color]);
};

exports.bold = function(state)
{

};

exports.fgColor = function(color)
{
  return this.requestWithWords(0xFF7F, [color]);
};

exports.fontId = function(fontNo)
{

};

exports.height = function(multiplier)
{
  return this.requestWithWords(0xFF7B, [multiplier]);
};

exports.inverse = function(state)
{

};

exports.italic = function(state)
{

};

exports.moveCursor = function({line, column})
{
  return this.requestWithWords(0xFFE4, [line, column]);
};

exports.opacity = function(opaque)
{
  return this.requestWithWords(0xFF77, [opaque ? 1 : 0]);
};

exports.set = function({func, value})
{
  return this.requestWithWords(0xFFE3, [func, value]);
};

exports.underline = function(state)
{

};

exports.width = function(multiplier)
{
  return this.requestWithWords(0xFF7C, [multiplier]);
};

exports.xGap = function(pixels)
{

};

exports.yGap = function(pixels)
{

};
