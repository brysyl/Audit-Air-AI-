/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts Float32Array audio samples (-1.0 to 1.0) to 16-bit PCM Little Endian base64 string.
 */
export function pcm16ToBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Scale float to 16-bit signed integer
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, int16, true); // true = Little Endian
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 encoded 16-bit PCM string into Int16Array.
 */
export function base64ToPcm16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/**
 * Converts Int16Array PCM samples into normalized Float32Array (-1.0 to 1.0).
 */
export function pcm16ToFloat32(pcmData: Int16Array): Float32Array {
  const float32 = new Float32Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    float32[i] = pcmData[i] / 32768.0;
  }
  return float32;
}

export class AudioStreamManager {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private outputGainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted = false;

  constructor() {
    // Lazy initialized on user action to satisfy browser Autoplay restrictions
  }

  /**
   * Resumes or creates the output AudioContext (24kHz) for playback.
   */
  public async initOutputContext(): Promise<AudioContext> {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
      
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.8;

      this.outputGainNode = this.outputAudioCtx.createGain();
      this.outputGainNode.gain.value = 1.0;

      this.outputAnalyser.connect(this.outputGainNode);
      this.outputGainNode.connect(this.outputAudioCtx.destination);
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }

    if (this.outputAudioCtx.state === 'suspended') {
      await this.outputAudioCtx.resume();
    }

    return this.outputAudioCtx;
  }

  /**
   * Starts capturing 16kHz audio from mic and streaming PCM chunks.
   */
  public async startMicCapture(
    stream: MediaStream,
    onChunk: (base64Pcm: string) => void
  ): Promise<void> {
    this.micStream = stream;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });

    if (this.inputAudioCtx.state === 'suspended') {
      await this.inputAudioCtx.resume();
    }

    this.micSource = this.inputAudioCtx.createMediaStreamSource(stream);
    this.micAnalyser = this.inputAudioCtx.createAnalyser();
    this.micAnalyser.fftSize = 256;
    this.micAnalyser.smoothingTimeConstant = 0.75;

    // Use 2048 or 4096 buffer size (~128ms/256ms chunk duration at 16kHz)
    const bufferSize = 4096;
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

    this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.isMuted) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const base64Pcm = pcm16ToBase64(inputData);
      onChunk(base64Pcm);
    };

    this.micSource.connect(this.micAnalyser);
    this.micAnalyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioCtx.destination);
  }

  /**
   * Schedules a 24kHz raw PCM chunk for gapless playback.
   */
  public async playPcmChunk(base64Data: string): Promise<void> {
    try {
      const audioCtx = await this.initOutputContext();
      const pcm16 = base64ToPcm16(base64Data);
      const float32 = pcm16ToFloat32(pcm16);

      if (float32.length === 0) return;

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;

      if (this.outputAnalyser) {
        sourceNode.connect(this.outputAnalyser);
      } else {
        sourceNode.connect(audioCtx.destination);
      }

      const currentTime = audioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.02; // Tiny safety buffer to prevent clicks
      }

      sourceNode.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.push(sourceNode);
      sourceNode.onended = () => {
        const index = this.activeSources.indexOf(sourceNode);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
      };
    } catch (err) {
      console.error('Failed to schedule audio playback chunk:', err);
    }
  }

  /**
   * Immediately stops any playing audio (e.g. for user interruption / barge-in).
   */
  public stopPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source might already have stopped
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
  }

  /**
   * Toggles microphone mute state.
   */
  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Reads time-domain audio wave data for microphone.
   */
  public getMicWaveformData(targetArray: Uint8Array): void {
    if (this.micAnalyser && !this.isMuted) {
      this.micAnalyser.getByteTimeDomainData(targetArray);
    } else {
      targetArray.fill(128); // 128 is center/flatline
    }
  }

  /**
   * Reads frequency/volume data for microphone.
   */
  public getMicFrequencyData(targetArray: Uint8Array): void {
    if (this.micAnalyser && !this.isMuted) {
      this.micAnalyser.getByteFrequencyData(targetArray);
    } else {
      targetArray.fill(0);
    }
  }

  /**
   * Reads time-domain wave data for output / AI voice.
   */
  public getOutputWaveformData(targetArray: Uint8Array): void {
    if (this.outputAnalyser && this.activeSources.length > 0) {
      this.outputAnalyser.getByteTimeDomainData(targetArray);
    } else {
      targetArray.fill(128);
    }
  }

  /**
   * Reads frequency data for output / AI voice.
   */
  public getOutputFrequencyData(targetArray: Uint8Array): void {
    if (this.outputAnalyser && this.activeSources.length > 0) {
      this.outputAnalyser.getByteFrequencyData(targetArray);
    } else {
      targetArray.fill(0);
    }
  }

  public isAiSpeaking(): boolean {
    return this.activeSources.length > 0;
  }

  /**
   * Full teardown of audio streams and contexts.
   */
  public cleanup(): void {
    this.stopPlayback();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.micAnalyser) {
      this.micAnalyser.disconnect();
      this.micAnalyser = null;
    }

    if (this.outputAnalyser) {
      this.outputAnalyser.disconnect();
      this.outputAnalyser = null;
    }

    if (this.outputGainNode) {
      this.outputGainNode.disconnect();
      this.outputGainNode = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }

    this.micStream = null;
  }
}
