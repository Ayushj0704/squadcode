import { cn } from "../../lib/utils";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import React, { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export type FloatingDockItem = {
  title: string;
  icon: React.ReactNode;
  href: string;
  colorClass?: string;
  bgClass?: string;
};

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) {
  return (
    <div className="w-full max-w-fit mx-auto px-2 sm:px-4">
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   macOS DOCK MOBILE
══════════════════════════════════════════════════════════════════════════════ */
function FloatingDockMobile({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-3 flex flex-col gap-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-3 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl"
          >
            {items.map((item, idx) => {
              const isActive = location.pathname === item.href;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    transition: { delay: idx * 0.05 },
                  }}
                  transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                      isActive ? "bg-black/10 dark:bg-white/10 font-bold" : "hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="h-5 w-5 flex items-center justify-center">{item.icon}</div>
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{item.title}</span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 border border-black/10 shadow-xl backdrop-blur-md"
      >
        <svg className="h-6 w-6 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   macOS DOCK DESKTOP (Exact Aceternity / macOS Dock Magnification Physics)
══════════════════════════════════════════════════════════════════════════════ */
function FloatingDockDesktop({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-4 rounded-2xl bg-gray-50/80 dark:bg-neutral-900/80 backdrop-blur-2xl px-4 pb-3 md:flex border border-gray-200/80 dark:border-neutral-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[90] relative",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   macOS ICON CONTAINER
══════════════════════════════════════════════════════════════════════════════ */
function IconContainer({
  mouseX,
  title,
  icon,
  href,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isActive = location.pathname === href;

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Original Aceternity / macOS Dock Magnification formula
  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);

  // Exact spring physics
  const springConfig = { mass: 0.1, stiffness: 150, damping: 12 };
  const width = useSpring(widthTransform, springConfig);
  const height = useSpring(heightTransform, springConfig);
  const widthIcon = useSpring(widthTransformIcon, springConfig);
  const heightIcon = useSpring(heightTransformIcon, springConfig);

  const [hovered, setHovered] = useState(false);

  return (
    <Link to={href} className="group relative flex flex-col items-center">
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileTap={{ scale: 0.9, y: 4 }}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-full bg-gray-200/90 dark:bg-neutral-800/90 border border-black/5 dark:border-white/10 shadow-md transition-colors",
          isActive && "ring-2 ring-black/30 dark:ring-white/40 shadow-lg"
        )}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-gray-100/90 dark:border-neutral-800 dark:bg-neutral-800/90 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:text-white shadow-lg backdrop-blur-md pointer-events-none z-50"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center text-neutral-600 dark:text-neutral-300"
        >
          {icon}
        </motion.div>
      </motion.div>

      {/* macOS Active App Dot */}
      {isActive && (
        <motion.span
          layoutId="dock-dot"
          className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-neutral-800 dark:bg-white shadow-sm"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        />
      )}
    </Link>
  );
}
