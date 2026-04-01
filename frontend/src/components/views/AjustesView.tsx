import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Bell, Radio, Camera, Eye, EyeOff, Save, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Select from '../ui/Select';
import { getProfile, updateProfile } from '../../services/authService';
import { getMotas, updateMotasBulk } from '../../services/dataService';

// Componente para el interruptor (toggle switch)
const ToggleSwitch = ({ label, description, checked = false, onChange, actionButton }: { label: string, description: string, checked?: boolean, onChange?: (checked: boolean) => void, actionButton?: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border gap-4">
    <div className="flex-1">
      <p className="font-semibold text-card-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-4">
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange && onChange(e.target.checked)} className="peer sr-only" />
        <div className="peer h-6 w-11 rounded-full bg-muted/70 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
      </label>
      {actionButton && (
        <div className="pl-4 border-l border-border">
          {actionButton}
        </div>
      )}
    </div>
  </div>
);

// Definimos qué props recibe este componente
interface AjustesViewProps {
  onProfileUpdate: () => void; // Función que nos pasa el padre (Dashboard)
}

export default function AjustesView({ onProfileUpdate }: AjustesViewProps) {
  const [activeTab, setActiveTab] = useState('perfil');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ESTADOS DE DATOS
  const [profileImage, setProfileImage] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telemetria, setTelemetria] = useState('240');
  const [roaming, setRoaming] = useState(true);

  // ESTADOS DE SEGURIDAD
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ESTADOS DE UI (Feedback)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Cargar datos al montar
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getProfile();
      setNombre(user.nombre || '');
      setEmail(user.email || '');
      // Si no hay foto, usamos la ruta relativa por defecto
      setProfileImage(user.foto || '../../../media/profile.png');
    } catch (error) {
      console.error("Error cargando perfil", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfileImage(base64);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Validación de contraseña nueva
  const passwordRequirements = [
    { id: 1, text: "Mínimo 8 caracteres", valid: newPassword.length >= 8 },
    { id: 2, text: "Al menos una mayúscula", valid: /[A-Z]/.test(newPassword) },
    { id: 3, text: "Al menos un número", valid: /[0-9]/.test(newPassword) },
    { id: 4, text: "Al menos un carácter especial", valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const isNewPasswordValid = passwordRequirements.every(req => req.valid);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSave = async () => {
    setStatus('loading');
    setStatusMessage('');

    try {
      if (activeTab === 'perfil') {
        // Actualizar datos básicos y foto
        await updateProfile({
          nombre,
          // email: email, // Normalmente el email no se cambia tan fácil, lo omitimos por seguridad o lo incluimos si el backend lo permite
          foto: profileImage.includes('base64') ? profileImage : undefined // Solo enviamos si cambió (es base64)
        });
        setStatusMessage('Perfil actualizado correctamente');
        
        // ¡IMPORTANTE! Avisamos al padre (Dashboard) para que actualice el Header
        onProfileUpdate();
      } 
      else if (activeTab === 'seguridad') {
        // Validaciones previas
        if (!isNewPasswordValid) throw new Error('La nueva contraseña no es segura.');
        if (!passwordsMatch) throw new Error('Las contraseñas no coinciden.');
        
        // Actualizar contraseña
        await updateProfile({
          password: newPassword
        });
        
        // Limpiar campos
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setStatusMessage('Contraseña actualizada correctamente');
      }

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000); // Resetear estado a los 3s
    } catch (error: any) {
      setStatus('error');
      setStatusMessage(error.message || 'Error al guardar cambios');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const handleSaveTelemetria = async () => {
    setStatus('loading');
    setStatusMessage('');
    try {
      const motas = await getMotas();
      const motaIds = motas.map((m: any) => m.id);
      
      if (motaIds.length === 0) {
        throw new Error('No hay motas registradas para actualizar');
      }

      const res = await updateMotasBulk({ motaIds, frecuencia: parseInt(telemetria) });
      setStatusMessage(`Frecuencia aplicada a ${res.motasActualizadas} motas`);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (error: any) {
      setStatus('error');
      setStatusMessage(error.message || 'Error al actualizar telemetría');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const handleSaveRoaming = async () => {
    setStatus('loading');
    setStatusMessage('');
    try {
      const motas = await getMotas();
      const motaIds = motas.map((m: any) => m.id);

      if (motaIds.length === 0) {
        throw new Error('No hay motas registradas para actualizar');
      }

      const res = await updateMotasBulk({ motaIds, conexionPublica: roaming });
      setStatusMessage(`Roaming aplicado a ${res.motasActualizadas} motas`);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (error: any) {
      setStatus('error');
      setStatusMessage(error.message || 'Error al actualizar roaming');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'red', label: 'Red LoRaWAN', icon: Radio },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <motion.div key="perfil" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold text-card-foreground mb-6">Perfil Público</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <img 
                    src={profileImage} 
                    alt="Foto de perfil" 
                    className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-md bg-muted"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="text-white" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">{nombre || 'Usuario'}</h3>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="flora-input mt-2" />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'seguridad':
        return (
          <motion.div key="seguridad" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold text-card-foreground mb-6">Contraseña y Seguridad</h2>
            <div className="space-y-6">
              {/* <div>
                <label className="text-sm font-medium text-muted-foreground">Contraseña Actual</label>
                <div className="relative mt-2">
                  <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="flora-input pr-10" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-4 text-muted-foreground">
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div> */}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nueva Contraseña</label>
                <div className="relative mt-2">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flora-input pr-10" />
                   <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-4 text-muted-foreground">
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Requisitos de contraseña */}
                {newPassword.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {passwordRequirements.map(req => (
                      <div key={req.id} className={`flex items-center gap-2 text-xs ${req.valid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {req.valid ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-current opacity-50" />}
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

               <div>
                <label className="text-sm font-medium text-muted-foreground">Confirmar Nueva Contraseña</label>
                <div className="relative mt-2">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="flora-input pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-4 text-muted-foreground">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs mt-2 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 'notificaciones':
        return (
          <motion.div
            key="notificaciones"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center h-full min-h-[300px] p-8"
          >
            <div className="p-5 bg-primary/10 rounded-full mb-6">
              <Sparkles className="text-primary" size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-card-foreground mb-2">Nueva Funcionalidad en Camino</h2>
            <p className="text-muted-foreground max-w-md">
              Estamos trabajando en un sistema de notificaciones personalizable para que no te pierdas nada importante. ¡Pronto podrás configurar tus alertas aquí!
            </p>
          </motion.div>
        );
      case 'red':
        return (
          <motion.div key="red" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold text-card-foreground mb-6">Red LoRaWAN</h2>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <label className="text-base font-semibold text-card-foreground">Intervalo de Telemetría Global</label>
                    <p className="text-xs text-muted-foreground mt-1">Frecuencia con la que los dispositivos envían datos. Puede ser anulado por un dispositivo individual.</p>
                  </div>
                  <button 
                    onClick={handleSaveTelemetria}
                    disabled={status === 'loading'}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shrink-0 ml-4"
                  >
                    <Save size={16} /> Aplicar
                  </button>
                </div>
                <Select
                  value={telemetria}
                  onChange={setTelemetria}
                  options={[
                  { value: '15', label: '15 Minutos (Modo Instalación / Pruebas)' },
                  { value: '60', label: '1 Hora (Alta Precisión)' },
                  { value: '240', label: '4 Horas (Recomendado FLoRa)' },
                  { value: '480', label: '8 Horas (Modo Ahorro)' },
                  { value: '720', label: '12 Horas (Ultra Eco)' }
                  ]}
                />
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground bg-muted/50 p-3 rounded-xl border border-border">
                {telemetria === '15' && <span><strong>Advertencia:</strong> Ideal solo para el día de instalación. La batería durará semanas.</span>}
                {telemetria === '60' && <span><strong>Impacto:</strong> Batería estimada de 6 a 8 meses. Útil para invernaderos o picos de calor.</span>}
                {telemetria === '240' && <span><strong>Impacto:</strong> Batería garantizada de más de 1 año. Mejor equilibrio.</span>}
                {telemetria === '480' && <span><strong>Impacto:</strong> Batería de 1.5 a 2 años. Excelente para otoño/invierno.</span>}
                {telemetria === '720' && <span><strong>Impacto:</strong> Batería de más de 3 años. Ideal para secano profundo o árboles maduros.</span>}
              </div>
              </div>
              <ToggleSwitch 
                label="Roaming de Red" 
                description="Permitir que tus motas usen gateways públicos si pierden la señal con los tuyos." 
                checked={roaming}
                onChange={setRoaming}
                actionButton={
                  <button 
                    onClick={handleSaveRoaming}
                    disabled={status === 'loading'}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
                  >
                    <Save size={16} /> Aplicar
                  </button>
                }
              />
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-12 h-full">
      {/* Sidebar de Ajustes */}
      <aside className="h-fit w-full rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl md:w-1/4">
        <h3 className="text-lg font-semibold text-muted-foreground mb-4 px-2">Ajustes</h3>
        <nav className="space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm min-h-[400px]">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
        
        {/* El footer con el botón de guardar solo se muestra si la pestaña activa no es 'notificaciones' */}
        {activeTab !== 'notificaciones' && (
          <div className="mt-6 flex items-center justify-between rounded-3xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
            {/* Área de Notificaciones de Estado */}
            <div className="flex-1 px-4">
              <AnimatePresence mode="wait">
                {status === 'success' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm">
                    <Check size={18} /> {statusMessage}
                  </motion.div>
                )}
                {status === 'error' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm">
                    <AlertCircle size={18} /> {statusMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {(activeTab === 'perfil' || activeTab === 'seguridad') && (
              <button
                onClick={handleSave}
                disabled={status === 'loading' || (activeTab === 'seguridad' && (!isNewPasswordValid || !passwordsMatch))}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {status === 'loading' ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            )}
          </div>
        )}
      </main>
    </motion.div>
  );
}