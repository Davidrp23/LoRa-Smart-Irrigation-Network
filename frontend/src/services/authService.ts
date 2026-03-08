const API_URL = 'http://localhost:3000';

export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Credenciales incorrectas');
  }

  return await response.json();
};

export const register = async (nombre: string, email: string, password: string) => {
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nombre, email, password }),
  });

  if (!response.ok) throw new Error('Error al registrar usuario');
  return await response.json();
};

export const getProfile = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // <--- Aquí enviamos el pase VIP
    },
  });

  if (!response.ok) throw new Error('Error al obtener perfil');
  return await response.json();
};

export const updateProfile = async (datos: any) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(datos),
  });

  if (!response.ok) throw new Error('Error al actualizar perfil');
  return await response.json();
};