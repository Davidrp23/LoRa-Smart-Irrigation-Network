import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export default function Select({ 
  value, 
  onChange, 
  options, 
  placeholder = "Seleccionar...", 
  className = "", 
  label, 
  disabled = false 
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Encontrar la opción seleccionada para mostrar su etiqueta
  const selectedOption = options.find(o => String(o.value) === String(value));

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flora-input flex items-center justify-between w-full text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={`truncate ${!selectedOption ? "text-muted-foreground" : "text-foreground"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl max-h-60 overflow-y-auto"
          >
            <ul className="py-1">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(option.value));
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between group transition-colors
                      ${String(option.value) === String(value)
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-popover-foreground hover:bg-muted'
                      }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {String(option.value) === String(value) && (
                      <Check size={16} className="text-primary flex-shrink-0 ml-2" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}