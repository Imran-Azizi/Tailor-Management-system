export const EMERGENCY_SOUND_MUTED_KEY = "emergency_alarm_muted";
export const EMERGENCY_SOUND_LAST_SEEN_KEY = "emergency_alarm_last_seen";

function getLatestEmergencyTimestamp(notifications = []) {
  return notifications.reduce((maxValue, item) => {
    const current = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
    return Number.isFinite(current) && current > maxValue ? current : maxValue;
  }, 0);
}

export function shouldPlayEmergencyAlertCycle(notifications = []) {
  const latestTimestamp = getLatestEmergencyTimestamp(notifications);
  if (!latestTimestamp) return false;

  let lastSeen = 0;
  try {
    lastSeen = Number(localStorage.getItem(EMERGENCY_SOUND_LAST_SEEN_KEY) || 0);
  } catch {
    lastSeen = 0;
  }

  if (latestTimestamp <= lastSeen) return false;

  try {
    localStorage.setItem(
      EMERGENCY_SOUND_LAST_SEEN_KEY,
      String(latestTimestamp),
    );
  } catch {
    // Ignore storage write failures.
  }

  return true;
}

export function playEmergencyAlertSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.06, now);
    master.connect(audioCtx.destination);

    const tones = [740, 880, 740];
    tones.forEach((frequency, index) => {
      const start = now + index * 0.26;
      const end = start + 0.18;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03);
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
