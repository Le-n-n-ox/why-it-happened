import { motion } from "framer-motion";

interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <label className="relative ml-auto block h-6 w-[46px] flex-none cursor-pointer min-[901px]:[[data-collapsed=true]_&]:ml-0">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      
      {/* Track */}
      <motion.div
        initial={false}
        animate={{
          backgroundColor: checked ? "var(--accent)" : "var(--surface-2)",
          borderColor: checked ? "var(--accent)" : "var(--border)",
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute inset-0 rounded-full border-2 transition-shadow peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        aria-hidden="true"
      />
      
      {/* Knob */}
      <motion.div
        initial={false}
        animate={{
          x: checked ? 22 : 0,
          backgroundColor: checked ? "var(--accent-ink)" : "var(--muted)",
          // Creates the crescent moon effect when unchecked
          boxShadow: checked ? "none" : "inset 4.5px -1.5px 0 var(--surface-2)",
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 35,
          mass: 0.8,
          // Fade the shadow slightly faster than the movement for a clean shape morph
          boxShadow: { duration: 0.15 } 
        }}
        className="absolute left-[3px] top-[3px] size-3.5 rounded-full"
        aria-hidden="true"
      />
    </label>
  );
}