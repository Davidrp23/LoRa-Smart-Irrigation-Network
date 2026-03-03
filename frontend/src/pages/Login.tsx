import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, ArrowRight, Mail, Lock, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Typewriter from 'typewriter-effect';

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // EL INTERRUPTOR MÁGICO: True = Login, False = Registro
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Manejador del formulario unificado
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      console.log("Haciendo POST a /auth/login...");
    } else {
      console.log("Haciendo POST a /auth/register con Nombre, Email y Password...");
    }
    // Simulación: viajamos al dashboard
    navigate('/dashboard');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      
      {/* VIDEO DE FONDO */}
      <video autoPlay loop muted playsInline className="absolute z-0 min-h-full min-w-full object-cover"
        src="media/videos/background_login_video.mp4"
      />

      {/* OVERLAY con desenfoque suave (sm) */}
      <div className="absolute z-10 min-h-full min-w-full bg-slate-900/70 backdrop-blur-sm" />

      {/* Botón del Tema */}
      <button onClick={toggleTheme} className="absolute right-6 top-6 z-30 rounded-full bg-background/50 p-3 text-foreground backdrop-blur-sm transition-all hover:bg-muted/50">
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-20 flex w-full max-w-7xl flex-col items-center justify-between px-6 md:flex-row md:px-10">
        
        {/* Lado Izquierdo */}
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="mb-12 flex flex-col items-center text-center md:mb-0 md:items-start md:text-left">
          <div className="flex items-center gap-3">
            {/* Contenedor del logo con colores adaptativos para Light/Dark mode */}
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-primary/50 bg-primary/10 shadow-xl shadow-primary/20 backdrop-blur-xl">
            
                <motion.img 
                    src="media/FLoRa_logo.png" 
                    alt="FLoRa Logo" 
                    className="h-16 w-16 object-contain"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
                />
            
            </div>
            <h1 className="text-6xl font-extrabold tracking-tighter text-white">FLoRa</h1>
          </div>
          <p className="mt-4 text-xl font-medium text-primary">
            Smart Irrigation Network
          </p>
          <div className="font-tech mt-8 h-16 text-3xl text-white/80">
            <Typewriter options={{ strings: ['Conectando el campo.', 'Agricultura de precisión.', 'IoT de bajo consumo.', 'Riego inteligente LoRa.'], autoStart: true, loop: true, deleteSpeed: 30, delay: 70 }} />
          </div>
        </motion.div>

        {/* Lado Derecho: Tarjeta Dinámica */}
        {/* Usamos layout de framer-motion para que la tarjeta se estire o encoja con fluidez */}
        <motion.div layout initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }} className="w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card/60 dark:bg-card/80 p-10 shadow-2xl backdrop-blur-xl">
          
          <motion.h2 layout="position" className="mb-8 text-2xl font-bold text-card-foreground">
            {isLoginMode ? 'Acceso al Panel' : 'Crear Cuenta FLoRa'}
          </motion.h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Animamos el campo NOMBRE para que aparezca/desaparezca */}
            <AnimatePresence mode="popLayout">
              {!isLoginMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="text" required={!isLoginMode} placeholder="Nombre completo" 
                    className="w-full rounded-2xl border-input bg-background/80 px-12 py-4 text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout="position" className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input type="email" required placeholder="user@flora.com" 
                className="w-full rounded-2xl border-input bg-background/80 px-12 py-4 text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </motion.div>

            <motion.div layout="position" className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input type="password" required placeholder="••••••••" 
                className="w-full rounded-2xl border-input bg-background/80 px-12 py-4 text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </motion.div>

            <motion.button layout="position" type="submit" className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              {isLoginMode ? 'Iniciar Sesión' : 'Registrarse'} <ArrowRight size={18} />
            </motion.button>
          </form>

          <motion.div layout="position" className="mt-10 border-t border-foreground/20 pt-6 text-center">
            <p className="text-sm text-foreground/80">
              {isLoginMode ? '¿No tienes cuenta? ' : '¿Ya eres usuario? '}
              
              {/* ESTE BOTÓN CAMBIA DE MODO AL PULSARLO */}
              <button 
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)} 
                className="font-semibold text-green-700 dark:text-primary transition-colors hover:text-green-800 dark:hover:text-primary/80"
              >
                {isLoginMode ? 'Regístrate como agricultor' : 'Inicia Sesión'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}