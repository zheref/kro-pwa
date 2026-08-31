import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Text,
  useToken,
} from '@chakra-ui/react';

interface DurationDialProps {
  duration: number;
  onDurationChange?: (duration: number) => void;
  startTime?: string;
  endTime?: string;
  isRunning?: boolean;
  potentialStartTime?: string;
  potentialEndTime?: string;
}

const TICK_COUNT = 60;
const TICK_DEGREES = 360 / TICK_COUNT;
const MAX_DURATION = 3600; // 1 hour in seconds

export default function DurationDial({
  duration: propDuration,
  onDurationChange,
  isRunning = false,
}: DurationDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [internalDuration, setInternalDuration] = useState(propDuration);
  const dialRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(null);

  // Get Chakra UI tokens
  const [lightNeutralBg, lightNeutralFg1, lightTicksBg, lightBlue600] = useToken('colors', [
    'gray.50',
    'gray.900',
    'gray.500',
    'blue.600'
  ]);

  const [darkNeutralBg, darkNeutralFg1, darkTicksBg, darkBlue600] = useToken('colors', [
    'gray.900',
    'gray.50',
    'gray.400',
    'blue.400'
  ]);

  const [progressBg] = useToken('colors', [
    'blue.500'
  ]);

  // Ensure we're working with seconds
  const durationInSeconds = Math.floor(propDuration);

  useEffect(() => {
    if (!isRunning) {
      setInternalDuration(durationInSeconds);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    } else {
      setInternalDuration(durationInSeconds);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        setInternalDuration((prev) => {
          if (prev <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = undefined;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [durationInSeconds, isRunning]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateAngleAndDuration = (clientX: number, clientY: number): number => {
    if (!dialRef.current) return internalDuration;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    const angle = Math.atan2(deltaY, deltaX);
    let degrees = ((angle * 180 / Math.PI) + 90) % 360;
    if (degrees < 0) degrees += 360;

    return Math.round((degrees / 360) * MAX_DURATION / 60) * 60;
  };

  const updateDuration = (newDuration: number) => {
    setInternalDuration(newDuration);
    if (onDurationChange) {
      onDurationChange(newDuration);
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isRunning) return;
      e.preventDefault();
      const newDuration = calculateAngleAndDuration(e.clientX, e.clientY);
      setIsDragging(true);
      updateDuration(newDuration);
    },
    [isRunning, updateDuration]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || isRunning) return;
      e.preventDefault();
      const newDuration = calculateAngleAndDuration(e.clientX, e.clientY);
      updateDuration(newDuration);
    },
    [isDragging, isRunning, updateDuration]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const renderTicks = () => {
    const ticks = [];
    const progressRatio = internalDuration / MAX_DURATION;
    const progressDegrees = progressRatio * 360;

    for (let i = 0; i < TICK_COUNT; i++) {
      const rotation = i * TICK_DEGREES;
      const isActive = rotation <= progressDegrees;
      ticks.push(
        <Box
          key={i}
          position="absolute"
          width="2px"
          height="12px"
          bg={{
            base: isActive ? lightBlue600 : lightTicksBg,
            _dark: isActive ? darkBlue600 : darkTicksBg,
          }}
          transformOrigin="50% 100px"
          left="calc(50% - 1px)"
          top="0"
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        />
      );
    }
    return ticks;
  };

  const getProgressStyle = () => {
    const progressRatio = internalDuration / MAX_DURATION;
    const degrees = progressRatio * 360;

    return {
      background: `conic-gradient(${progressBg} 0deg, ${progressBg} ${degrees}deg, transparent ${degrees}deg, transparent 360deg)`,
      transform: 'rotate(0deg)',
    };
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap="8px"
      userSelect="none"
      touchAction="none"
    >
      <Box
        ref={dialRef}
        position="relative"
        width="200px"
        height="200px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={{
          base: lightNeutralBg,
          _dark: darkNeutralBg,
        }}
        cursor="pointer"
        borderRadius="full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Box
          position="absolute"
          width="170px"
          height="170px"
          top="15px"
          left="15px"
          borderRadius="full"
          bg="transparent"
          transformOrigin="50% 50%"
          opacity="0.85"
          transition="transform 0.1s ease, background 0.1s ease"
          style={getProgressStyle()}
        />
        {renderTicks()}
        <Box
          position="relative"
          zIndex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap="4px"
          pointerEvents="none"
        >
          <Text
            fontSize="32px"
            fontWeight="600"
            color={{
              base: lightNeutralFg1,
              _dark: darkNeutralFg1,
            }}
          >
            {formatDuration(internalDuration)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
} 