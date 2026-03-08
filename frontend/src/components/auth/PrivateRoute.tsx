import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  // 1. Comprueba si existe el token en el almacenamiento local
  const token = localStorage.getItem('token');

  // 2. Si hay token, <Outlet /> renderiza el componente hijo (Dashboard).
  //    Si no hay token, <Navigate /> redirige al usuario a la página de login.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;