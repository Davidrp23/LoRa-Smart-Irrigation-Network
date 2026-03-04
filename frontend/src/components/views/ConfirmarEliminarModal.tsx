import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmarEliminarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  parcelaNombre: string | undefined;
}

export default function ConfirmarEliminarModal({ isOpen, onClose, onConfirm, parcelaNombre }: ConfirmarEliminarModalProps) {
  const [confirmText, setConfirmText] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setConfirmText(''), 200); // Delay reset to avoid flash
    }
  }, [isOpen]);

  const isMatch = confirmText === parcelaNombre;

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl"
          >
            <div className="p-8">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-destructive/20 text-red-600 dark:text-destructive">
                  <AlertTriangle size={32} />
                </div>
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-xl font-bold text-card-foreground">¿Eliminar Parcela?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Esta acción es irreversible. Se borrarán todos los datos asociados a la parcela{' '}
                  <strong className="font-bold text-card-foreground">{parcelaNombre}</strong>.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Para confirmar, por favor escribe el nombre de la parcela:
                </p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={parcelaNombre}
                  className="flora-input mt-4 text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-6 bg-muted border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-card px-4 py-3 text-sm font-bold text-card-foreground shadow-sm ring-1 ring-border hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isMatch}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground transition-colors disabled:cursor-not-allowed disabled:bg-destructive/40 hover:bg-destructive/90 shadow-lg shadow-destructive/30"
              >
                Eliminar Parcela
              </button>
            </div>
            
            <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted">
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
