import { motion, AnimatePresence } from 'framer-motion';
import { Link2Off, AlertTriangle } from 'lucide-react';

interface Dispositivo {
  id: number;
  codigoVinculacion: string;
  tipo: 'router' | 'mota';
  nombre?: string;
  modelo?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dispositivo: Dispositivo | null;
}

export default function ConfirmarDesvincularModal({ isOpen, onClose, onConfirm, dispositivo }: Props) {
  if (!dispositivo) return null;

  const deviceName = dispositivo.tipo === 'mota' ? dispositivo.nombre : dispositivo.modelo;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl"
          >
            <div className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-card-foreground">
                ¿Desvincular de la Cuenta?
              </h3>
              <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
                Estás a punto de desvincular el dispositivo{' '}
                <strong className="text-card-foreground">{deviceName}</strong>. 
                Se eliminará permanentemente de tu cuenta.
              </p>
              <div className="mt-4 bg-muted border border-border p-3 rounded-xl text-xs text-muted-foreground">
                <p>
                  Podrás volver a vincularlo en cualquier momento usando su código de vinculación: {' '}
                  <strong className="font-mono text-card-foreground">{dispositivo.codigoVinculacion}</strong>.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-6 bg-muted border-t border-border">
              <button 
                onClick={onClose} 
                className="rounded-xl bg-card px-4 py-3 text-sm font-bold text-card-foreground shadow-sm ring-1 ring-border hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-all"
              >
                <Link2Off size={18} />
                Sí, Desvincular
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
