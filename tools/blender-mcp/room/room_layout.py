"""Pianta della stanza giocabile, in scala reale (1 unità = 10 cm, come il PC).

Blender è Z-up, pavimento a Z = 0. L'export glTF converte in Y-up:
Blender (x, y, z) -> Three.js (x, z, -y), quindi la parete nord (+Y, quella
della scrivania) finisce verso -Z, davanti alla camera iniziale.

    N  scrivania + neon, comodino, letto (angolo NE)
    E  finestra sopra il letto
    S  porta d'uscita (angolo SE), armadio (angolo SO)
    O  TV, libreria (angolo NO)
"""

# interno della stanza: 4.65 x 3.8 m, soffitto 2.7 m
X0, X1 = -24.5, 22.0  # 4.65 m: lascia passare tra libreria e scrivania
Y0, Y1 = -19.0, 19.0
H = 27.0
WALL = 1.2  # spessore muri
SKIRT_H, SKIRT_D = 0.8, 0.12  # battiscopa

# porta (parete sud): luce 80 x 210 cm
DOOR_X = (12.5, 20.5)
DOOR_H = 21.0

# finestra (parete est): 120 x 130 cm, davanzale a 95 cm
WIN_Y = (3.0, 15.0)
WIN_Z = (9.5, 22.5)

# scrivania contro la parete nord, alta 78.5 cm come nel sito
DESK_X = (-15.5, 3.5)
DESK_Y = (Y1 - 8.0, Y1 - 0.05)
DESK_TOP = 7.85
DESK_T = 0.35
DESK_CENTER = ((DESK_X[0] + DESK_X[1]) / 2, (DESK_Y[0] + DESK_Y[1]) / 2)

# posizione del case e del monitor relative al centro scrivania (come in PCWorld.ts/buildDesk.ts,
# convertite: Three (x, -, z) -> Blender (x, -z))
PC_ANCHOR = (DESK_CENTER[0] + 5.2, DESK_CENTER[1] + 0.9, DESK_TOP)
MONITOR_ANCHOR = (DESK_CENTER[0] - 2.7, DESK_CENTER[1] + 1.7, DESK_TOP)
SCREEN_W, SCREEN_H, SCREEN_Z = 7.1, 7.1 / (16 / 9), 3.4

# letto 140 x 200, testiera contro la parete nord, fianco contro la parete est
BED_X = (X1 - 14.6, X1 - 0.2)
BED_Y = (Y1 - 20.6, Y1 - 0.2)

# comodino tra scrivania e letto
NIGHT_X = (DESK_X[1] + 0.4, BED_X[0] - 0.3)
NIGHT_Y = (Y1 - 4.2, Y1 - 0.1)
NIGHT_H = 5.2

# TV 55" sulla parete ovest, su un mobile basso
TV_Y = -4.0
TV_STAND = (X0 + 0.1, X0 + 4.1, TV_Y - 8.0, TV_Y + 8.0, 4.6)  # x0, x1, y0, y1, altezza

# libreria nell'angolo nord-ovest, armadio nell'angolo sud-ovest
SHELF = (X0 + 0.05, X0 + 3.95, Y1 - 11.0, Y1 - 0.1, 18.0)  # x0, x1, y0, y1, altezza
WARDROBE = (X0 + 0.05, X0 + 15.05, Y0 + 0.05, Y0 + 6.05, 21.5)  # x0, x1, y0, y1, altezza

PLAYER_SPAWN = ((DOOR_X[0] + DOOR_X[1]) / 2, Y0 + 4.0)
EYE_HEIGHT = 16.5
