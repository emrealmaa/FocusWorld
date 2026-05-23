import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const DURATIONS = {
  '25/5': { work: 25 * 60, break: 5 * 60 },
  '50/10': { work: 50 * 60, break: 10 * 60 },
};

export const usePomodoro = ({ mode = '25/5', customWork = 25, customBreak = 5, onSessionComplete } = {}) => {
  const getWork = () =>
    mode === 'custom' ? customWork * 60 : (DURATIONS[mode]?.work ?? 25 * 60);
  const getBreak = () =>
    mode === 'custom' ? customBreak * 60 : (DURATIONS[mode]?.break ?? 5 * 60);

  const [phase, setPhase] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(getWork());
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [disturbanceCount, setDisturbanceCount] = useState(0);
  const [waveState, setWaveState] = useState('calm');

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Refs for values needed inside the interval callback (avoids stale closures)
  const phaseRef = useRef(phase);
  const disturbanceRef = useRef(0);
  const modeConfigRef = useRef({ mode, customWork, customBreak });
  const onCompleteRef = useRef(onSessionComplete);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { onCompleteRef.current = onSessionComplete; }, [onSessionComplete]);
  useEffect(() => {
    modeConfigRef.current = { mode, customWork, customBreak };
  }, [mode, customWork, customBreak]);

  // Reset timer when mode changes (only if idle)
  useEffect(() => {
    if (phase === 'idle') {
      setTimeLeft(getWork());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, customWork, customBreak]);

  // AppState: detect when user leaves app during a work session
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const goingBackground = nextState !== 'active';

      if (wasActive && goingBackground && phaseRef.current === 'work') {
        disturbanceRef.current += 1;
        setDisturbanceCount(disturbanceRef.current);
        setWaveState('disturbed');
      } else if (nextState === 'active' && phaseRef.current === 'work') {
        setWaveState('calm');
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          // Transition phase after tick (outside state update)
          setTimeout(() => {
            const cfg = modeConfigRef.current;
            const workSecs =
              cfg.mode === 'custom' ? cfg.customWork * 60 : (DURATIONS[cfg.mode]?.work ?? 25 * 60);
            const breakSecs =
              cfg.mode === 'custom' ? cfg.customBreak * 60 : (DURATIONS[cfg.mode]?.break ?? 5 * 60);

            if (phaseRef.current === 'work') {
              setWaveState('complete');
              setSessionCount((n) => n + 1);
              onCompleteRef.current?.({
                disturbanceCount: disturbanceRef.current,
                durationMinutes: Math.round(workSecs / 60),
              });
              // Brief pause before break starts
              setTimeout(() => {
                phaseRef.current = 'break';
                setPhase('break');
                setTimeLeft(breakSecs);
                setWaveState('calm');
                setDisturbanceCount(0);
                disturbanceRef.current = 0;
                setIsRunning(true);
              }, 2000);
            } else {
              phaseRef.current = 'idle';
              setPhase('idle');
              setTimeLeft(workSecs);
              setIsRunning(false);
              setWaveState('calm');
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const totalDuration = phaseRef.current === 'break' ? getBreak() : getWork();
  const progress = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0;

  const start = () => {
    phaseRef.current = 'work';
    setPhase('work');
    setTimeLeft(getWork());
    setDisturbanceCount(0);
    disturbanceRef.current = 0;
    setWaveState('calm');
    setIsRunning(true);
  };

  const pause = () => setIsRunning(false);
  const resume = () => setIsRunning(true);

  const reset = () => {
    clearInterval(intervalRef.current);
    phaseRef.current = 'idle';
    setPhase('idle');
    setTimeLeft(getWork());
    setIsRunning(false);
    setWaveState('calm');
    setDisturbanceCount(0);
    disturbanceRef.current = 0;
  };

  return {
    phase,
    timeLeft,
    isRunning,
    sessionCount,
    disturbanceCount,
    waveState,
    progress,
    totalDuration,
    start,
    pause,
    resume,
    reset,
  };
};
