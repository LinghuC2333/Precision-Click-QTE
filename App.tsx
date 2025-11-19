import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TargetZone, GameState, Grade } from './types';
import { CONFIG, TARGET_WIDTHS } from './constants';
import { GameTrack } from './components/GameTrack';
import { RetroButton } from './components/RetroButton';
import { Play, RotateCcw, AlertTriangle, Trophy, Activity, Timer as TimerIcon } from 'lucide-react';
import { soundManager } from './utils/audio';

// Helper to generate non-overlapping targets
const generateTargets = (): TargetZone[] => {
  const targets: TargetZone[] = [];
  const safeMargin = 5; // Keep away from edges
  
  // Create 3 zones
  for (let i = 0; i < 3; i++) {
    const width = TARGET_WIDTHS[i];
    let start = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 100) {
      start = Math.random() * (100 - width - (safeMargin * 2)) + safeMargin;
      valid = true;
      
      // Check overlap with existing targets (add some padding)
      for (const t of targets) {
        if (start < t.start + t.width + 5 && start + width + 5 > t.start) {
          valid = false;
          break;
        }
      }
      attempts++;
    }
    
    targets.push({ id: i, start, width, hit: false });
  }
  return targets;
};

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [timeLeft, setTimeLeft] = useState(CONFIG.duration);
  const [targets, setTargets] = useState<TargetZone[]>([]);
  const [punishmentEndTime, setPunishmentEndTime] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [finalGrade, setFinalGrade] = useState<Grade | null>(null);

  // Refs for animation loop to avoid closure staleness
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const cursorRef = useRef(0);
  const directionRef = useRef(1); // 1 for right, -1 for left
  const lastFrameTimeRef = useRef(0);
  const targetsRef = useRef<TargetZone[]>([]);
  const gameStateRef = useRef<GameState>(GameState.MENU);

  // Sync refs with state for the loop
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- Game Loop ---
  const animate = useCallback((time: number) => {
    if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
    // Limit to max 60fps calculation to keep speed consistent across refresh rates roughly
    // but using time delta is better.
    // Simplified: just move per frame for visual smoothness, assuming 60fps.
    
    if (gameStateRef.current === GameState.PLAYING) {
      const currentPos = cursorRef.current;
      let newPos = currentPos + (CONFIG.cursorSpeed * directionRef.current);

      // Bounce logic
      if (newPos >= 100) {
        newPos = 100;
        directionRef.current = -1;
      } else if (newPos <= 0) {
        newPos = 0;
        directionRef.current = 1;
      }

      cursorRef.current = newPos;
      setCursorPosition(newPos); // Triggers render
    } else if (gameStateRef.current === GameState.PUNISHED) {
      // Check if punishment is over
      if (Date.now() >= punishmentEndTime) {
         // Punishment end is handled by useEffect below
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [punishmentEndTime]);

  // Start/Stop Animation
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    // Continue timer during punishment to penalize mistakes
    if (gameState === GameState.PLAYING || gameState === GameState.PUNISHED) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newItem = prev - 0.1;
          if (newItem <= 0) {
            endGame(false);
            return 0;
          }
          return newItem;
        });
      }, 100);
    }

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Punishment Timer Logic
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (gameState === GameState.PUNISHED) {
      const duration = punishmentEndTime - Date.now();
      if (duration > 0) {
        timeout = setTimeout(() => {
          setGameState(GameState.PLAYING);
        }, duration);
      } else {
         setGameState(GameState.PLAYING);
      }
    }
    return () => clearTimeout(timeout);
  }, [gameState, punishmentEndTime]);


  // --- Actions ---

  const startGame = () => {
    soundManager.init().then(() => {
      soundManager.playClick();
      soundManager.startAmbient();
    });
    
    setTargets(generateTargets());
    setCursorPosition(0);
    cursorRef.current = 0;
    directionRef.current = 1;
    setTimeLeft(CONFIG.duration);
    setGameState(GameState.PLAYING);
    setFinalGrade(null);
  };

  const endGame = (victory: boolean) => {
    soundManager.stopAmbient();
    
    if (victory) {
      soundManager.playVictory();
      setGameState(GameState.VICTORY);
      const timeTaken = CONFIG.duration - timeLeft;
      if (timeTaken < 10) setFinalGrade(Grade.S);
      else if (timeTaken < 20) setFinalGrade(Grade.A);
      else setFinalGrade(Grade.B);
    } else {
      soundManager.playFailure();
      setGameState(GameState.FAILURE);
      setFinalGrade(Grade.FAIL);
    }
  };

  const handleInteraction = () => {
    if (gameState !== GameState.PLAYING) return;

    const currentPos = cursorRef.current;
    const currentTargets = targetsRef.current;

    // Find if we hit an active target
    const hitIndex = currentTargets.findIndex(t => 
      !t.hit && currentPos >= t.start && currentPos <= (t.start + t.width)
    );

    if (hitIndex !== -1) {
      // SUCCESS HIT
      soundManager.playHit();
      const newTargets = [...currentTargets];
      newTargets[hitIndex].hit = true;
      setTargets(newTargets);

      // Check win condition
      if (newTargets.every(t => t.hit)) {
        endGame(true);
      }
    } else {
      // MISS / PUNISHMENT
      // Check if we are in an already hit zone? 
      const inGrayZone = currentTargets.some(t => 
        t.hit && currentPos >= t.start && currentPos <= (t.start + t.width)
      );

      if (!inGrayZone) {
        soundManager.playPunish();
        triggerPunishment();
      }
    }
  };

  const triggerPunishment = () => {
    setGameState(GameState.PUNISHED);
    setPunishmentEndTime(Date.now() + CONFIG.punishmentDuration);
  };

  // --- Render Helpers ---

  const isPunished = gameState === GameState.PUNISHED;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${isPunished ? 'bg-[#1a0505]' : 'bg-zinc-950'}`}>
      
      {/* Ambient Background Glows */}
      <div className={`fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isPunished ? 'via-red-500' : 'via-cyan-500'} to-transparent opacity-50`} />
      <div className="scanline" />

      {/* Header / HUD */}
      <div className="w-full max-w-3xl flex justify-between items-end mb-12 border-b border-white/10 pb-4">
        <div>
          <h1 className={`text-4xl font-bold tracking-tighter flex items-center gap-3 ${isPunished ? 'text-red-500' : 'text-white'}`}>
            <Activity className={isPunished ? "animate-pulse" : ""} />
            CYBER_SYNC_PROTOCOL
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-[0.3em]">NEURAL LINK STATUS: {gameState}</p>
        </div>
        <div className="text-right">
          <div className={`text-5xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
            {timeLeft.toFixed(1)}<span className="text-sm text-gray-500 ml-2">s</span>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Time Remaining</div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative w-full flex flex-col items-center gap-8">
        
        {/* Status Overlay Text */}
        {isPunished && (
          <div className="absolute -top-16 text-red-500 font-bold tracking-[0.5em] animate-pulse flex items-center gap-2">
            <AlertTriangle size={20} />
            SYSTEM LOCKOUT // RECALIBRATING
          </div>
        )}

        {/* The Track */}
        <div className="w-full flex justify-center">
             <GameTrack 
              cursorPosition={cursorPosition}
              targets={targets}
              gameState={gameState}
              onTrackClick={handleInteraction}
             />
        </div>

        {/* Interaction Button (Mobile/Desktop alternative to clicking bar) */}
        <div 
          className="w-full max-w-3xl h-64 flex items-center justify-center touch-none"
          onPointerDown={handleInteraction} // Better for mobile latency than onClick
        >
          {gameState === GameState.PLAYING || gameState === GameState.PUNISHED ? (
             <div className={`
                w-full h-full border border-dashed rounded-lg flex items-center justify-center transition-all duration-200
                ${isPunished 
                  ? 'border-red-900 bg-red-950/10 cursor-not-allowed' 
                  : 'border-cyan-900/50 bg-cyan-950/5 hover:bg-cyan-950/10 cursor-pointer active:bg-cyan-900/20 active:bg-cyan-950/30 active:scale-[0.99]'
                }
             `}>
                <span className={`text-sm tracking-widest ${isPunished ? 'text-red-700' : 'text-cyan-700'}`}>
                  {isPunished ? 'LOCKED' : 'TAP ANYWHERE TO SYNC'}
                </span>
             </div>
          ) : null}
        </div>

      </div>

      {/* Overlays (Menu, Win, Loss) */}
      {gameState === GameState.MENU && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full border border-cyan-900 bg-black p-8 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
            <h2 className="text-3xl text-white mb-2 font-bold">PROTOCOL INITIATED</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              Synchronize the data stream by locking onto the <span className="text-green-400">GREEN ZONES</span>.
              <br/><br/>
              Avoid signal noise. Missed targets result in <span className="text-red-500">SYSTEM LOCKOUT</span> (2s penalty).
              <br/><br/>
              Complete all 3 sync points before time runs out.
            </p>
            <RetroButton onClick={startGame} className="w-full">
              <Play size={18} /> Initialize
            </RetroButton>
          </div>
        </div>
      )}

      {(gameState === GameState.VICTORY || gameState === GameState.FAILURE) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
          <div className={`max-w-md w-full border p-1 relative ${gameState === GameState.VICTORY ? 'border-green-500' : 'border-red-500'}`}>
            <div className="bg-black p-8 flex flex-col items-center text-center">
              
              {gameState === GameState.VICTORY ? (
                <>
                  <Trophy className="text-yellow-400 mb-4" size={48} />
                  <h2 className="text-4xl text-green-400 font-bold mb-1">SYNC COMPLETE</h2>
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-8">Data Secure</p>
                  
                  <div className="flex flex-col items-center justify-center w-full mb-8">
                    <span className="text-gray-500 text-xs uppercase mb-2">Performance Rating</span>
                    <span className={`text-8xl font-bold ${
                      finalGrade === Grade.S ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 
                      finalGrade === Grade.A ? 'text-cyan-400' : 'text-white'
                    }`}>
                      {finalGrade}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="text-red-500 mb-4" size={48} />
                  <h2 className="text-4xl text-red-500 font-bold mb-1">SYNC FAILED</h2>
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-8">Connection Lost</p>
                  <div className="bg-red-950/30 border border-red-900 p-4 w-full mb-8">
                    <p className="text-red-400 font-mono text-sm">FATAL ERROR: TIMEOUT</p>
                  </div>
                </>
              )}

              <RetroButton 
                onClick={startGame} 
                className="w-full" 
                variant={gameState === GameState.VICTORY ? 'primary' : 'danger'}
              >
                <RotateCcw size={18} /> Reboot System
              </RetroButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;