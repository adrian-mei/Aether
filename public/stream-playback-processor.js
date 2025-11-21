class StreamPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
    this.port.onmessage = (e) => {
      const { type, data } = e.data;
      if (type === "chunk") {
        // data is ArrayBuffer of Float32
        const chunk = new Float32Array(data);
        const combined = new Float32Array(this.buffer.length + chunk.length);
        combined.set(this.buffer, 0);
        combined.set(chunk, this.buffer.length);
        this.buffer = combined;
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(inputs, outputs, _parameters) {
    const output = outputs[0];
    const channelCount = output.length;
    if (this.buffer.length === 0) {
      // output silence
      for (let ch = 0; ch < channelCount; ch++) {
        output[ch].fill(0);
      }
      return true;
    }

    const frames = output[0].length;
    if (this.buffer.length >= frames) {
      // consume
      for (let ch = 0; ch < channelCount; ch++) {
        for (let i = 0; i < frames; i++) {
          output[ch][i] = this.buffer[i]; // mono -> all channels
        }
      }
      // drop used samples
      this.buffer = this.buffer.subarray(frames);
    } else {
      // partial fill then silence
      for (let ch = 0; ch < channelCount; ch++) {
        for (let i = 0; i < frames; i++) {
          output[ch][i] = i < this.buffer.length ? this.buffer[i] : 0;
        }
      }
      this.buffer = new Float32Array(0);
    }
    return true;
  }
}

registerProcessor("stream-playback-processor", StreamPlaybackProcessor);
