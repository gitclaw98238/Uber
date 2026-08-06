import { useEffect, useMemo, useState } from 'react';

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
}

const CountdownTimer = ({ seconds, onComplete }: CountdownTimerProps) => {
  const [remaining, setRemaining] = useState(seconds);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    const timer = window.setTimeout(() => setRemaining((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, onComplete]);

  const progress = useMemo(() => remaining / Math.max(seconds, 1), [remaining, seconds]);

  return (
    <div className="countdown-timer">
      <svg viewBox="0 0 64 64" className="countdown-ring">
        <circle cx="32" cy="32" r={radius} className="countdown-track" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="countdown-progress"
          style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - progress) }}
        />
      </svg>
      <div className="countdown-value">{remaining}s</div>
    </div>
  );
};

export default CountdownTimer;
