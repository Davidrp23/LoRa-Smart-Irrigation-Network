import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, ArrowRight, Mail, Lock, User, CheckCircle2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Typewriter from 'typewriter-effect';
import { login, register } from '../services/authService';

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // EL INTERRUPTOR MÁGICO: True = Login, False = Registro
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false); // <--- NUEVO ESTADO: ¿Todo salió bien?
  const [showPassword, setShowPassword] = useState(false);

  // Estado para los datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Validación de contraseña
  const passwordRequirements = [
    { id: 1, text: "Mínimo 8 caracteres", valid: formData.password.length >= 8 },
    { id: 2, text: "Al menos una mayúscula", valid: /[A-Z]/.test(formData.password) },
    { id: 3, text: "Al menos un número", valid: /[0-9]/.test(formData.password) },
    { id: 4, text: "Al menos un carácter especial", valid: /[^A-Za-z0-9]/.test(formData.password) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.valid);

  // Mostrar requisitos solo si estamos registrando y el usuario ha empezado a escribir la contraseña
  const showPasswordRequirements = !isLoginMode && formData.password.length > 0;

  // Manejador del formulario unificado
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoginMode && !isPasswordValid) {
      setError("La contraseña no cumple con los requisitos de seguridad.");
      return;
    }

    try {
      if (isLoginMode) {
        const data = await login(formData.email, formData.password);
        localStorage.setItem('token', data.access_token); // Guardamos el token
      } else {
        // Registro
        await register(formData.nombre, formData.email, formData.password);
        // Auto-login tras registro
        const data = await login(formData.email, formData.password);
        localStorage.setItem('token', data.access_token);
      }
      
      // ÉXITO: Activamos la animación y esperamos un poco antes de viajar
      setIsSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    }
  };

  // Efecto para auto-login si ya existe un token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Si hay token, mostramos la animación de bienvenida y redirigimos
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [navigate]); // El array vacío asegura que se ejecuta solo una vez al cargar

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
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-primary/50 bg-primary/10 shadow-md shadow-primary/5 backdrop-blur-xl">
            
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
          <AnimatePresence mode="wait">
            
            {/* CASO 1: ÉXITO (Animación de bienvenida) */}
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-500"
                >
                  <CheckCircle2 size={48} strokeWidth={3} />
                </motion.div>
                <h2 className="text-3xl font-bold text-card-foreground">¡Bienvenido!</h2>
                <p className="mt-2 text-muted-foreground">Accediendo al sistema FLoRa...</p>
              </motion.div>
            ) : (
              
              /* CASO 2: FORMULARIO NORMAL */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.h2 layout="position" className="mb-8 text-2xl font-bold text-card-foreground">
                  {isLoginMode ? 'Acceso al Panel' : 'Crear Cuenta FLoRa'}
                </motion.h2>
                
                {error && (
                  <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 text-center border border-red-500/20">{error}</div>
                )}

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
                        <input 
                          type="text" 
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleChange}
                          required={!isLoginMode} 
                          placeholder="Nombre" 
                          className="w-full rounded-2xl border-input bg-background/80 px-12 py-4 text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div layout="position" className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required 
                      placeholder="user@flora.com" 
                      className="w-full rounded-2xl border-input bg-background/80 px-12 py-4 text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40" />
                  </motion.div>

                  <motion.div layout="position" className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="w-full rounded-2xl border-input bg-background/80 px-12 py-4 pr-12 text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </motion.div>

                  {/* INDICADOR DE SEGURIDAD DE CONTRASEÑA (SOLO REGISTRO) */}
                  <AnimatePresence>
                    {showPasswordRequirements && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1 border border-border/50">
                          <p className="font-bold text-muted-foreground mb-2">La contraseña debe tener:</p>
                          {passwordRequirements.map(req => (
                            <div key={req.id} className={`flex items-center gap-2 ${req.valid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                              {req.valid ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-current opacity-50" />}
                              <span>{req.text}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button layout="position" type="submit" className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/10 transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
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
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}