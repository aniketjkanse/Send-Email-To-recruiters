import { motion } from 'framer-motion';

export const EASE = [0.22, 1, 0.36, 1];

/* Page-level container: fades/slides in and staggers its FadeItem children */
export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: EASE,
      when: 'beforeChildren',
      staggerChildren: 0.055
    }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: EASE } }
};

export const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }
};

/* Wrap a group of FadeItem / motion children to stagger them in */
export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
};

export function Page({ children, className = '' }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeItem({ children, className = '', ...rest }) {
  return (
    <motion.div variants={itemVariants} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

/* Springy hover/press for interactive cards */
export const springHover = {
  whileHover: { y: -4, transition: { type: 'spring', stiffness: 320, damping: 22 } },
  whileTap: { scale: 0.985 }
};
