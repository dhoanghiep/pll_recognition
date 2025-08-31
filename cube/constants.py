from typing import List, Dict
import numpy as np


# ---------- Face identifiers ----------
FACE_U = "U"  # Up
FACE_R = "R"  # Right
FACE_F = "F"  # Front
FACE_D = "D"  # Down
FACE_L = "L"  # Left
FACE_B = "B"  # Back

FACES: List[str] = [FACE_U, FACE_R, FACE_F, FACE_D, FACE_L, FACE_B]

# ---------- Color mapping ----------
FACE_COLOR: Dict[str, str] = {
    FACE_U: "white",
    FACE_D: "yellow",
    FACE_F: "green",
    FACE_R: "red",
    FACE_B: "blue",
    FACE_L: "orange",
}

# ---------- Opposite face ----------
OPPOSITE_FACE = {
    FACE_U: FACE_D,
    FACE_D: FACE_U,
    FACE_F: FACE_B,
    FACE_B: FACE_F,
    FACE_R: FACE_L,
    FACE_L: FACE_R,
}

# ---------- Middle layer axis ----------
MIDDLE_LAYER_AXIS = {
    "M": [FACE_R, FACE_L],
    "E": [FACE_U, FACE_D],
    "S": [FACE_F, FACE_B],
}

# ---------- Face to coordinate ----------
FACE_COORD = {
    FACE_U: np.array([0, 0, 1]),
    FACE_D: np.array([0, 0, -1]),
    FACE_F: np.array([1, 0, 0]),
    FACE_B: np.array([-1, 0, 0]),
    FACE_R: np.array([0, 1, 0]),
    FACE_L: np.array([0, -1, 0]),
}
