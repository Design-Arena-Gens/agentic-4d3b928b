'use client';

import { useEffect, useRef, useState } from 'react';

interface Ball {
  x: number;
  y: number;
  radius: number;
  number: number;
  color: string;
  isStriped: boolean;
}

export default function PoolRuler() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [cueBall, setCueBall] = useState<Ball | null>(null);
  const [aimLine, setAimLine] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [selectedTarget, setSelectedTarget] = useState<Ball | null>(null);
  const [isDraggingCue, setIsDraggingCue] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [lineLength, setLineLength] = useState(800);

  const BALL_RADIUS = 15;
  const TABLE_COLOR = '#0a5f38';
  const RAIL_COLOR = '#654321';

  const ballColors = [
    { color: '#FFF176', isStriped: false }, // 1 yellow
    { color: '#2196F3', isStriped: false }, // 2 blue
    { color: '#F44336', isStriped: false }, // 3 red
    { color: '#9C27B0', isStriped: false }, // 4 purple
    { color: '#FF9800', isStriped: false }, // 5 orange
    { color: '#4CAF50', isStriped: false }, // 6 green
    { color: '#8D6E63', isStriped: false }, // 7 brown
    { color: '#212121', isStriped: false }, // 8 black
    { color: '#FFF176', isStriped: true },  // 9 yellow stripe
    { color: '#2196F3', isStriped: true },  // 10 blue stripe
    { color: '#F44336', isStriped: true },  // 11 red stripe
    { color: '#9C27B0', isStriped: true },  // 12 purple stripe
    { color: '#FF9800', isStriped: true },  // 13 orange stripe
    { color: '#4CAF50', isStriped: true },  // 14 green stripe
    { color: '#8D6E63', isStriped: true },  // 15 brown stripe
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize cue ball
    const cue: Ball = {
      x: canvas.width * 0.25,
      y: canvas.height / 2,
      radius: BALL_RADIUS,
      number: 0,
      color: '#FFFFFF',
      isStriped: false,
    };
    setCueBall(cue);

    // Initialize object balls in triangle formation
    const startX = canvas.width * 0.7;
    const startY = canvas.height / 2;
    const ballSpacing = BALL_RADIUS * 2.1;

    const newBalls: Ball[] = [];
    let ballIndex = 0;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (ballIndex < 15) {
          const x = startX + row * ballSpacing * 0.866;
          const y = startY + (col - row / 2) * ballSpacing;

          newBalls.push({
            x,
            y,
            radius: BALL_RADIUS,
            number: ballIndex + 1,
            ...ballColors[ballIndex],
          });
          ballIndex++;
        }
      }
    }

    setBalls(newBalls);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = TABLE_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw rails
      const railWidth = 40;
      ctx.fillStyle = RAIL_COLOR;
      ctx.fillRect(0, 0, canvas.width, railWidth);
      ctx.fillRect(0, canvas.height - railWidth, canvas.width, railWidth);
      ctx.fillRect(0, 0, railWidth, canvas.height);
      ctx.fillRect(canvas.width - railWidth, 0, railWidth, canvas.height);

      // Draw pockets
      const pocketRadius = 25;
      const pockets = [
        [railWidth, railWidth],
        [canvas.width / 2, railWidth],
        [canvas.width - railWidth, railWidth],
        [railWidth, canvas.height - railWidth],
        [canvas.width / 2, canvas.height - railWidth],
        [canvas.width - railWidth, canvas.height - railWidth],
      ];

      ctx.fillStyle = '#000000';
      pockets.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, pocketRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw guideline
      if (cueBall && aimLine && showTrajectory) {
        const dx = aimLine.x - cueBall.x;
        const dy = aimLine.y - cueBall.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / length;
        const dirY = dy / length;

        // Main aim line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x + dirX * lineLength, cueBall.y + dirY * lineLength);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost ball at target
        if (selectedTarget) {
          const ghostX = selectedTarget.x - dirX * (BALL_RADIUS * 2);
          const ghostY = selectedTarget.y - dirY * (BALL_RADIUS * 2);

          ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ghostX, ghostY, BALL_RADIUS, 0, Math.PI * 2);
          ctx.stroke();

          // Trajectory after hit
          const targetDx = selectedTarget.x - cueBall.x;
          const targetDy = selectedTarget.y - cueBall.y;
          const targetLength = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
          const targetDirX = targetDx / targetLength;
          const targetDirY = targetDy / targetLength;

          ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(selectedTarget.x, selectedTarget.y);
          ctx.lineTo(selectedTarget.x + targetDirX * 400, selectedTarget.y + targetDirY * 400);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw object balls
      balls.forEach((ball) => {
        drawBall(ctx, ball);

        // Highlight selected target
        if (selectedTarget && ball.number === selectedTarget.number) {
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw cue ball
      if (cueBall) {
        drawBall(ctx, cueBall);
      }
    };

    draw();
  }, [balls, cueBall, aimLine, selectedTarget, showTrajectory, lineLength]);

  const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball body
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.1,
      ball.x,
      ball.y,
      ball.radius
    );
    gradient.addColorStop(0, ball.number === 0 ? '#FFFFFF' : ball.color);
    gradient.addColorStop(1, ball.number === 0 ? '#DDDDDD' : shadeColor(ball.color, -30));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Stripe for striped balls
    if (ball.isStriped) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ball.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Ball number
    if (ball.number > 0) {
      ctx.fillStyle = ball.number === 8 ? '#FFFFFF' : '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.number.toString(), ball.x, ball.y);
    }

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  const shadeColor = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !cueBall) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'manual' || isDraggingCue) {
      setAimLine({ x, y });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !cueBall) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on cue ball to drag
    const distToCue = Math.sqrt((x - cueBall.x) ** 2 + (y - cueBall.y) ** 2);
    if (distToCue < BALL_RADIUS) {
      setIsDraggingCue(true);
      return;
    }

    // Check if clicking on a ball to auto-aim
    for (const ball of balls) {
      const dist = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
      if (dist < ball.radius) {
        setSelectedTarget(ball);
        if (mode === 'auto') {
          setAimLine({ x: ball.x, y: ball.y });
        }
        return;
      }
    }

    setSelectedTarget(null);
  };

  const handleMouseUp = () => {
    setIsDraggingCue(false);
  };

  const moveCueBall = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCue || !cueBall) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCueBall({ ...cueBall, x, y });
  };

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseMove(e);
    if (isDraggingCue) {
      moveCueBall(e);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleCanvasInteraction}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block', cursor: isDraggingCue ? 'grabbing' : 'crosshair' }}
      />

      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        minWidth: '250px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>8 Ball Pool Ruler</h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Mode:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setMode('manual')}
              style={{
                flex: 1,
                padding: '8px',
                background: mode === 'manual' ? '#4CAF50' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Manual
            </button>
            <button
              onClick={() => setMode('auto')}
              style={{
                flex: 1,
                padding: '8px',
                background: mode === 'auto' ? '#4CAF50' : '#555',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Auto
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={showTrajectory}
              onChange={(e) => setShowTrajectory(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Trajectory
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Line Length: {lineLength}px
          </label>
          <input
            type="range"
            min="200"
            max="1500"
            value={lineLength}
            onChange={(e) => setLineLength(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
          <p style={{ margin: '5px 0' }}>
            <strong>Manual:</strong> Move mouse to aim
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Auto:</strong> Click ball to auto-aim
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Drag</strong> cue ball to reposition
          </p>
          {selectedTarget && (
            <p style={{ margin: '10px 0 5px 0', color: '#4CAF50' }}>
              Target: Ball {selectedTarget.number}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
