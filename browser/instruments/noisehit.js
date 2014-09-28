'use strict';

// slightly based on http://webaudioapi.com/samples/procedural/procedural-sample.js

/**
 * Creates a AudioBufferSourceNode containing a short, looping sample of white noise.
 */
function createWhiteNoiseBufferSource(ctx) {
  var samples = 16*1024;
  var buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  var data = buffer.getChannelData(0);

  for (var i = 0; i < samples; i++) {
    data[i] = ((Math.random() * 2) - 1);
  }

  var node = ctx.createBufferSource();
  node.buffer = buffer;
  node.loop = true;

  return node;
}

/**
 * Schedules a certain hard-coded envelope on a given AudioParam, starting at t0.
 */
function scheduleParameterEnvelope(t0, param) {
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

  this.noiseNode = createWhiteNoiseBufferSource(ctx);
  this.noiseNode.start(0);

  this.volumeEnvNode = ctx.createGain();
  this.volumeEnvNode.gain.value = 0;

  // connect them up
  this.noiseNode.connect(this.volumeEnvNode);

  this.noiseNode.onended = function() {
    alert('ended');
  };
}

Backend.prototype.processInput = function(input) {
  // for now, no matter what input we get, we just play the same "note"
  scheduleParameterEnvelope(this.ctx.currentTime, this.volumeEnvNode.gain);
};

Backend.prototype.getOutputNode = function() {
  return this.volumeEnvNode;
}

module.exports = {
  createBackend: function(ctx) {
    return new Backend(ctx);
  },
}
