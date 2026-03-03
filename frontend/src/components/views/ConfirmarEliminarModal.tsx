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
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle size={32} className="text-destructive" />
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
                  className="mt-4 block w-full rounded-xl border-input bg-background px-4 py-3 text-center text-card-foreground focus:border-destructive focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/50 px-8 py-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-card-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isMatch}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-destructive-foreground transition-colors disabled:cursor-not-allowed disabled:bg-destructive/40 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30"
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
