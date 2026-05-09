export function getLatestNotificationTimestamp(notifications = []) {
  return notifications.reduce((maxValue, item) => {
    const current = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
    return Number.isFinite(current) && current > maxValue ? current : maxValue;
  }, 0);
}

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    master.connect(audioCtx.destination);

    const notes = [659.25, 880, 987.77];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.12;
      const end = start + 0.28;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(end + 0.02);
    });
  } catch {
    // Autoplay restrictions can block sound before user interaction.
  }
}
