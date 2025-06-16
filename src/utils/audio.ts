/**
 * Audio utilities for playing notification sounds
 */

// Extend Window interface to include webkit-prefixed AudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let audioContext: AudioContext | null = null;
let chimeBuffer: AudioBuffer | null = null;

/**
 * Initialize audio context and load the chime sound
 */
async function initializeAudio(): Promise<void> {
  if (audioContext && chimeBuffer) {
    return; // Already initialized
  }

  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Load the chime sound file
    const response = await fetch('/chime.mp3');
    const arrayBuffer = await response.arrayBuffer();
    chimeBuffer = await audioContext.decodeAudioData(arrayBuffer);

    console.log('Audio initialized successfully');
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
}

/**
 * Play the chime sound
 */
export async function playChime(): Promise<void> {
  try {
    // Initialize audio if needed
    await initializeAudio();

    if (!audioContext || !chimeBuffer) {
      console.warn('Audio not initialized, cannot play chime');
      return;
    }

    // Resume audio context if it's suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Create and play the sound
    const source = audioContext.createBufferSource();
    source.buffer = chimeBuffer;
    source.connect(audioContext.destination);
    source.start(0);

    console.log('Chime played');
  } catch (error) {
    console.error('Failed to play chime:', error);
  }
}

/**
 * Check if audio is supported
 */
export function isAudioSupported(): boolean {
  return !!(window.AudioContext || window.webkitAudioContext);
}
