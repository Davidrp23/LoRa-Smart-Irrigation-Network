import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

// Creamos la "memoria" global
const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Leemos si el usuario ya tenía el modo oscuro activado la última vez que entró
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("theme") as Theme) || "light"
  );

  // Cada vez que el tema cambia, actualizamos el HTML y lo guardamos
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personalizado para usarlo fácilmente en cualquier componente
export const useTheme = () => useContext(ThemeContext);