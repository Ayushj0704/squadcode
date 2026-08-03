import React from "react";
import { motion, type Transition } from "framer-motion";
import { Link } from "react-router-dom";

const transition: Transition = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.2 }}
        className="cursor-pointer font-bold text-sm text-ink-800 dark:text-ink-100 hover:text-brand-500 transition-colors py-1 px-3 rounded-lg hover:bg-surface-2"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_0.8rem)] left-1/2 -translate-x-1/2 pt-2 z-50">
              <motion.div
                transition={transition}
                layoutId="active"
                className="bg-surface-0/95 dark:bg-surface-0/95 backdrop-blur-xl rounded-2xl overflow-hidden border-2 border-border shadow-2xl p-4 min-w-[14rem]"
              >
                <motion.div layout className="w-max h-full">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative rounded-2xl border-2 border-border bg-surface-0/90 dark:bg-surface-0/90 backdrop-blur-md shadow-lg flex justify-center items-center space-x-2 sm:space-x-4 px-4 py-2"
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  src?: string;
  icon?: React.ElementType;
}) => {
  return (
    <Link to={href} className="flex space-x-3 group p-2 rounded-xl hover:bg-surface-2 transition">
      {src ? (
        <img
          src={src}
          width={70}
          height={70}
          alt={title}
          className="shrink-0 rounded-xl object-cover h-14 w-14 border border-border group-hover:scale-105 transition-transform"
        />
      ) : Icon ? (
        <div className="shrink-0 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 h-12 w-12 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-ink-900 dark:text-ink-50 group-hover:text-brand-500 transition-colors">
          {title}
        </h4>
        <p className="text-ink-500 dark:text-ink-400 text-xs max-w-[12rem] line-clamp-2 mt-0.5">
          {description}
        </p>
      </div>
    </Link>
  );
};

export const HoveredLink = ({ children, href, icon: Icon, ...rest }: any) => {
  return (
    <Link
      to={href}
      {...rest}
      className="flex items-center gap-2.5 text-ink-600 dark:text-ink-300 hover:text-brand-500 dark:hover:text-brand-400 font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-surface-2"
    >
      {Icon && <Icon className="h-4 w-4 text-ink-400 group-hover:text-brand-500 shrink-0" />}
      <span>{children}</span>
    </Link>
  );
};
