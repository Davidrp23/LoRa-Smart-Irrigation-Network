import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Bell, Radio, Camera, Eye, EyeOff, Save } from 'lucide-react';

// Componente para el interruptor (toggle switch)
const ToggleSwitch = ({ label, description, defaultChecked = false }: { label: string, description: string, defaultChecked?: boolean }) => (
  <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border">
    <div>
      <p className="font-semibold text-card-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
    </label>
  </div>
);

export default function AjustesView() {
  const [activeTab, setActiveTab] = useState('perfil');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
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
                  <img src={profileImage} alt="Foto de perfil" className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-md"/>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="text-white" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">David</h3>
                  <p className="text-sm text-muted-foreground">david@flora.com</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                  <input type="text" defaultValue="David" className="mt-2 w-full rounded-xl border-input bg-background px-4 py-3 text-card-foreground" />
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
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contraseña Actual</label>
                <div className="relative mt-2">
                  <input type={showCurrentPassword ? 'text' : 'password'} className="w-full rounded-xl border-input bg-background px-4 py-3 text-card-foreground" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-4 text-muted-foreground">
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nueva Contraseña</label>
                <div className="relative mt-2">
                  <input type={showNewPassword ? 'text' : 'password'} className="w-full rounded-xl border-input bg-background px-4 py-3 text-card-foreground" />
                   <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-4 text-muted-foreground">
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
               <div>
                <label className="text-sm font-medium text-muted-foreground">Confirmar Nueva Contraseña</label>
                <input type="password" className="mt-2 w-full rounded-xl border-input bg-background px-4 py-3 text-card-foreground" />
              </div>
            </div>
          </motion.div>
        );
      case 'notificaciones':
        return (
          <motion.div key="notificaciones" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold text-card-foreground mb-6">Preferencias de Notificaciones</h2>
            <div className="space-y-4">
              <ToggleSwitch label="Alertas de Humedad Crítica" description="Recibir un aviso cuando la humedad de una parcela sea inferior al 20%." defaultChecked />
              <ToggleSwitch label="Alertas de Batería Baja" description="Aviso cuando un dispositivo tenga menos del 15% de batería." defaultChecked />
              <ToggleSwitch label="Alertas de Conexión" description="Notificar si un dispositivo se desconecta de la red." defaultChecked />
              <ToggleSwitch label="Resumen Semanal" description="Recibir un informe del estado de los cultivos cada lunes." />
            </div>
          </motion.div>
        );
      case 'red':
        return (
          <motion.div key="red" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-bold text-card-foreground mb-6">Red LoRaWAN</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Intervalo de Telemetría Global</label>
                <p className="text-xs text-muted-foreground/80 mb-2">Frecuencia con la que los dispositivos envían datos. Puede ser anulado por un dispositivo individual.</p>
                <select className="w-full rounded-xl border-input bg-background px-4 py-3 text-card-foreground">
                  <option>Cada 15 minutos (Estándar)</option>
                  <option>Cada 30 minutos (Ahorro)</option>
                  <option>Cada 1 hora (Eco)</option>
                </select>
              </div>
              <ToggleSwitch label="Roaming de Red" description="Permitir que tus motas usen gateways públicos si pierden la señal con los tuyos." defaultChecked />
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
      <aside className="w-full md:w-1/4">
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
        <div className="flex justify-end mt-6">
          <button className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all">
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </main>
    </motion.div>
  );
}