import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";

export interface CometCardProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  rotateDepth?: number;
  glowColor?: string;
}

export function CometCard({
  children,
  className = "",
  style = {},
  rotateDepth = 15,
  glowColor = "rgba(255, 255, 255, 0.15)",
}: CometCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [rotateDepth, -rotateDepth]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-rotateDepth, rotateDepth]);
  
  const glareXStr = useTransform(mouseX, (val) => `${val}%`);
  const glareYStr = useTransform(mouseY, (val) => `${val}%`);
  const glowBackground = useMotionTemplate`radial-gradient(500px circle at ${glareXStr} ${glareYStr}, ${glowColor}, transparent 50%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;

    const xPct = (mouseXPos / width) - 0.5;
    const yPct = (mouseYPos / height) - 0.5;

    x.set(xPct);
    y.set(yPct);

    mouseX.set((mouseXPos / width) * 100);
    mouseY.set((mouseYPos / height) * 100);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
    mouseX.set(50);
    mouseY.set(50);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all duration-200 ease-out ${className}`}
      style={{
        perspective: "1000px",
        ...style,
      }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 350,
          damping: 25,
        }}
        className="relative h-full w-full rounded-[18px] overflow-hidden"
      >
        {children}

        {/* Comet Glowing Glare Overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-300 z-30"
          style={{
            opacity: isHovered ? 1 : 0,
            background: glowBackground,
          }}
        />
      </motion.div>
    </div>
  );
}

export default CometCard;
