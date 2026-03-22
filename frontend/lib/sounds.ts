const ctx = () => {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

function beep(frequency: number, duration: number, ac: AudioContext) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

export function playSound(sound: string) {
  const ac = ctx();
  if (!ac) return;

  if (sound === "none") return;

  if (sound === "chime") {
    beep(880, 0.15, ac);
    setTimeout(() => beep(1108, 0.15, ac), 120);
    setTimeout(() => beep(1320, 0.25, ac), 240);
    return;
  }

  if (sound === "bell") {
    beep(600, 0.4, ac);
    setTimeout(() => beep(600, 0.3, ac), 300);
    return;
  }

  // default
  beep(780, 0.2, ac);
  setTimeout(() => beep(1040, 0.3, ac), 150);
}
