# Arquitectura de Seguridad y Sincronización en Redes LoRa: Implementación y Análisis

El presente documento expone las decisiones de diseño adoptadas durante la integración de la capa de cifrado AES-128-CTR y el mecanismo Anti-Replay dentro del protocolo propietario FLoRa, diseñado para sistemas embebidos de bajos recursos (ESP32).

## 1. Validación Universal Anti-Replay (Global FCnt)
Para evitar que un atacante intercepte y repita paquetes legítimos (ataques de repetición), se ha incorporado un contador de trama (`fcnt` de 32 bits) en la cabecera del `LoRaMessage`.

### 1.1 Sincronización Estricta
El router mantiene en su RAM un registro de estado por cada cliente (`ClientCryptoState`), almacenando el último contador recibido (`lastFCnt`). La condición de validación matemática implementada es estrictamente monotónica creciente:
```cpp
if (incomingFCnt <= lastFCnt) { // Descarte o petición de re-sincronización }
```
> [!IMPORTANT]
> Se ha eliminado el condicional `lastFCnt != 0`. Dado que las variables de contador en la mota se incrementan *antes* de su transmisión, el primer paquete siempre ostentará un valor estrictamente positivo. Esto permite un código más resiliente frente a paquetes maliciosamente manipulados con `fcnt = 0`.

### 1.2 Recuperación Autónoma (`CRYPTO_ERROR`)
Cuando la validación del punto anterior fracasa, el router no opta por el descarte silencioso. Un descarte pasivo provocaría que la mota agote sus intentos de retransmisión (watchdog), reduciendo erróneamente la "salud" percibida de la red y forzando costosas re-evaluaciones de canales.
En su lugar, el router responde explícitamente con un nuevo enumerador `messageType::CRYPTO_ERROR`. Al recibirlo, la mota detiene su envío y transita inmediatamente al estado `STATE_START_JOIN`, resincronizando sus parámetros criptográficos sin corromper la evaluación de latencia o conectividad de la red.

## 2. Gestión de Joins y Persistencia No Volátil (NVS)
El paquete `JOIN_REQUEST` es la piedra angular que permite establecer un punto de sincronización a cero entre Mota y Router. Para evitar ataques de repetición en esta delicada fase, la mota lleva cuenta de sus uniones mediante la variable `join_cnt`.

### 2.1 Uso Eficiente de Memoria Flash
La variable `join_cnt` se almacena empleando el motor NVS (Non-Volatile Storage) a través de la librería `Preferences`.
> [!TIP]
> Dado que la mota no realiza uniones de forma rutinaria (solo ante reinicios profundos o cambios deliberados de router), las escrituras en la Flash son mínimas. Las memorias de los ESP32 soportan holgadamente decenas de miles de ciclos de escritura, por lo que almacenar un `join_cnt` global en NVS no compromete el ciclo de vida del hardware.

### 2.2 Contadores Globales y Desacoplo de Router
La mota no almacena un `join_cnt` por cada router al que se conecta, sino que mantiene un contador universal. Dado que las identificaciones de Mota y Router son únicas, si una mota migra a un segundo router incrementando su `join_cnt` a 3, y luego regresa al router original (que recordaba el valor 1), el router recibirá un `JOIN_REQUEST` con valor 4. Matemáticamente `4 > 1`, de modo que el router validará la unión sin ningún problema.
Esto elimina la necesidad de mantener pesadas y complejas tablas relacionales Mota-Router en la limitada memoria flash del dispositivo cliente.

### 2.3 Rechazo Activo (`JOIN_DENIED`)
Al igual que en los paquetes de datos rutinarios, si el router recibe un intento de Join con un contador caducado, emitirá proactivamente un mensaje `JOIN_DENIED`. Esto evita escenarios de contención donde el cliente espere infructuosamente por un *Timeout*, ahorrando batería y espectro electromagnético.

## 3. Telemetría y Monitorización Criptográfica
Para asegurar una observabilidad completa del sistema y facilitar tareas de mantenimiento y auditoría, se ha integrado la telemetría criptográfica en múltiples niveles del proyecto:

1. **Pantallas OLED (Feedback Visual):**
   - **Mota**: La pantalla OLED cuenta ahora con un campo `Crypto_err` en el panel de diagnósticos de red (Menú 2/7), mostrando en tiempo real los fallos de sincronía detectados por parte del dispositivo local.
   - **Router**: El menú general (3/3) aglutina y expone un contador global (`Crypto Errors`) que indica la cantidad de paquetes interceptados y descartados bajo sospecha de falsificación o error de desincronización en toda la celda LoRa.

2. **Propagación a Backend (Estructuras `SensorsData`):**
   - El struct `SensorsData` se ha ampliado para contener la métrica `crypto_err`. Cada vez que la mota notifica sus variables de entorno, también envía el estado de salud de su capa criptográfica al router. De esta manera, las anomalías de seguridad pueden ser indexadas y monitoreadas asíncronamente en el servidor de base de datos remoto.

## 4. Conclusión de Diseño
La asimetría en la persistencia de memoria (NVS robusto en la Mota vs RAM volátil en el Router) crea un ecosistema autorregulable. Si la memoria Flash de una mota quedara irremediablemente corrompida devolviendo su contador a `0`, la seguridad impide que se reincorpore, aislando el fallo. Para solventar este caso extremo, el administrador solo debe reiniciar el Router; al residir el estado de los clientes en RAM, el router olvida el historial, permitiendo una "tabula rasa" segura y controlada. Esto no solo recupera clientes anómalos, sino que limpia el vector de clientes de posibles "nodos fantasmas", manteniendo un rendimiento de enrutamiento óptimo.
