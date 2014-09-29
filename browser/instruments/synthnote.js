'use strict';

var instrumentUtil = require('../instrumentUtil.js');

/**
 * Schedules a certain hard-coded envelope on a given AudioParam, starting at t0.
 */
function scheduleParameterEnvelope(t0, param) {
  param.cancelScheduledValues(t0);
  param.linearRampToValueAtTime(0, t0);
  param.linearRampToValueAtTime(1, t0 + 0.001);
  param.linearRampToValueAtTime(0.3, t0 + 0.101);
  param.linearRampToValueAtTime(0, t0 + 0.500);
}

/**
 * Backend constructor
 */
function Backend(ctx) {
  // create nodes
  this.ctx = ctx;

  this.oscNode = ctx.createOscillator();
  this.oscNode.type = 'square';
  this.oscNode.frequency.value = 100;
  this.oscNode.start(0);

  this.filterNode = ctx.createBiquadFilter();
  this.filterNode.type = 'lowpass';
  this.filterNode.frequency.value = 2000;
  this.filterNode.Q.value = 1;

  this.volumeEnvNode = ctx.createGain();
  this.volumeEnvNode.gain.value = 0;

  // connect them up
  this.oscNode.connect(this.filterNode);
  this.filterNode.connect(this.volumeEnvNode);
}

Backend.prototype.processInput = function(data, clockTime) {
  // for now, no matter what input we get, we just play the same "note"
  var ctxCur = this.ctx.currentTime;
  var t = (clockTime > ctxCur) ? clockTime : ctxCur;
  scheduleParameterEnvelope(t, this.volumeEnvNode.gain);
};

Backend.prototype.getOutputNode = function() {
  return this.volumeEnvNode;
}

module.exports = {
  createBackend: function(ctx) {
    return new Backend(ctx);
  },

  createFrontend: function(container, sendData) {
    container.innerHTML = '<div id="note-button" style="height:100px;border:1px solid green;line-height:100px;text-align:center">Synth Note</div>';

    instrumentUtil.addPressListener(container.querySelector('#note-button'), function(e) {
      e.preventDefault();
      sendData();
    });
  }
}
