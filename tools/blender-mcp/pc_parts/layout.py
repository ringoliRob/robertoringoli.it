"""Misure condivise del PC, in scala reale (1 unità = 10 cm).

Riferimenti: scheda madre ATX 305 x 244 mm, CPU LGA1700 45 x 37.5 mm con fori del
dissipatore a 78 x 78 mm, slot di espansione a passo 20.32 mm, I/O posteriore
158.75 x 44.45 mm, moduli DDR5 133.35 mm con slot a passo ~10 mm.
Coordinate del case (Blender, Z-up): vetro su -X, fronte su -Y, retro su +Y.
"""

FACE = 0.945  # faccia della scheda madre rivolta al vetro (i componenti sporgono verso -X)

# case mid-tower compatto, come un Corsair 4000D (453 x 230 x 466 mm): 450 x 230 x 466 mm.
# Il retro resta a Y 2.40, così scheda madre, GPU e I/O non si spostano.
CASE_XL, CASE_XR = -1.15, 1.15  # vetro laterale / pannello destro
CASE_YF, CASE_YB = -2.10, 2.40  # vetro frontale / retro
CASE_H = 4.66
SHROUD_TOP = 1.18  # copertura dell'alimentatore

# scheda ATX: 244 mm dal fronte al retro, 305 mm in altezza; bordo posteriore allineato all'I/O del case
BOARD_Y = (-0.25, 2.19)
BOARD_Z = (1.35, 4.40)

# socket LGA1700: ~105 mm dal bordo posteriore, ~75 mm dal bordo superiore
SOCKET = (1.14, 3.65)
COOLER_HOLES = 0.39  # metà del passo 78 mm

# slot DDR5: il primo a ~15 mm dal socket, poi passo ~10 mm verso il fronte
DIMM_Y = (0.64, 0.543, 0.446, 0.349)
DIMM_Z = 3.62
DIMM_LEN = 1.38

# 7 slot di espansione a passo 20.32 mm; la GPU usa il primo (e copre il secondo)
SLOT_PITCH = 0.2032
SLOT_Z = [2.68 - k * SLOT_PITCH for k in range(7)]
PCIE_X16_Z = SLOT_Z[0]

# apertura dell'I/O posteriore nel retro del case: x0, x1, z0, z1
IO_CUT = (0.48, 0.93, BOARD_Z[1] - 1.56, BOARD_Z[1] + 0.03)

# 9 fori ATX con distanziali + fori liberi per altri formati
STANDOFFS = [(y, z) for y in (2.03, 0.75, -0.17) for z in (4.30, 2.88, 1.45)]
SPARE_HOLES = [(0.24, 4.30), (0.24, 2.55), (1.4, 1.45), (2.03, 2.0), (-0.17, 3.6), (1.4, 4.30)]

# connettori dove arrivano i cavi
ATX24_Z = 3.3  # 24 pin sul bordo anteriore (Y = BOARD_Y[0] + 0.075)
EPS_Y = 1.63  # 8 pin CPU sul bordo superiore (Z 4.33)
FAN_HEADERS = {"SYS_FAN": -0.12, "CPU_FAN": 0.12, "AIO_PUMP": 0.255}  # Y, sul bordo superiore (Z 4.36)
BOTTOM_HEADERS = {"F_PANEL": -0.08, "F_USB2": 0.28}  # Y, sul bordo inferiore (Z BOARD_Z[0] + 0.06)
USB3_HEADER = (BOARD_Y[0] + 0.06, 2.6)

# SSD M.2 2280 (80 x 22 mm) sotto il socket: vite in M2_Y0, connettore in M2_Y1
M2_Y0, M2_Y1, M2_Z = 0.97, 1.77, 2.97

# alimentatore ATX 150 x 86 x 160 mm nel vano in basso, retro contro il pannello posteriore
PSU_X = (-0.9, 0.6)
PSU_Y = (0.745, 2.345)
PSU_Z = (0.08, 0.94)

# radice della GPU: il PCB (Z locale 0.135) è centrato sullo slot x16
GPU_ROOT = (0.245, 0.85, PCIE_X16_Z - 0.135)
# connettore 12V-2x6 verso il fondo della scheda (Y locale), così il cavo non copre il logo;
# il passacavi della copertura PSU sta esattamente sotto
GPU_POWER_Y = 1.0
SHROUD_GROMMET = (-0.62, GPU_ROOT[1] + GPU_POWER_Y)
