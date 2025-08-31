# --------------------------------------------------------------
# Step 2 – Cubie Class
# --------------------------------------------------------------

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict
import numpy as np

from .constants import FACE_COORD, OPPOSITE_FACE, MIDDLE_LAYER_AXIS
from .common import Move


# --------------------------------------------------------------
# 1️⃣ Enumerations for clarity ----------------------------------
class CubieType(Enum):
    """Simple enumeration for the three cubie categories."""

    CORNER = "Corner"
    EDGE = "Edge"
    CENTER = "Center"


# --------------------------------------------------------------
# 2️⃣ Cubie dataclass ------------------------------------------
@dataclass
class Cubie:
    """
    Represents a single physical cubie on the Rubik's Cube.

    Attributes
    ----------
    cubie_type : CubieType
        One of CORNER, EDGE or CENTER.
    position   : Tuple[int, int, int]
        Relative coordinates in the cube's 3‑D space.
        (x, y, z) where each component is -1, 0 or +1.
    colors     : Dict[str, str]
        Mapping from face letter (e.g., 'U', 'R') to the sticker color.
    """

    cubie_type: CubieType
    colors: Dict[str, str] = field(default_factory=dict)

    # ----------------------------------------------------------
    def __post_init__(self):
        """Validate the cubie after construction."""
        # Position must be 3‑tuple of -1, 0 or +1
        if len(self.position) != 3:
            raise ValueError("Position must be a 3‑tuple")
        if any(p not in (-1, 0, 1) for p in self.position):
            raise ValueError("Position coordinates must be -1, 0 or +1")

        # The number of colors must match the cubie type
        expected_colors = {CubieType.CORNER: 3, CubieType.EDGE: 2, CubieType.CENTER: 1}[
            self.cubie_type
        ]
        if len(self.colors) != expected_colors:
            raise ValueError(
                f"{self.cubie_type.value} cubies must have exactly {expected_colors} color(s)"
            )

    # ----------------------------------------------------------
    def __repr__(self) -> str:
        return (
            f"Cubie(type={self.cubie_type.value}, "
            f"pos={self.position}, colors={self.colors})"
        )

    @property
    def faces(self):
        return list(self.colors.keys())

    @property
    def position(self):
        return np.sum([np.array(FACE_COORD[face]) for face in self.faces], axis=0)

    def rotate(self, move):
        if move[0] in "UDRLBF":
            if move[0] not in self.faces:
                return self
        if move[0] in "udrlbf":
            opposite_face = OPPOSITE_FACE[move[0].upper()]
            if opposite_face in self.faces:
                return self
        if move[0] in "MES":
            unrotated_faces = MIDDLE_LAYER_AXIS[move[0]]
            if len(set(unrotated_faces).intersection(set(self.faces))):
                return self
        rotation_loop = Move(move).rotation_loop
        new_colors = {}
        for key, value in self.colors.items():
            if rotation_loop.get(key):
                new_colors[rotation_loop[key]] = self.colors[key]
            else:
                new_colors[key] = self.colors[key]
        new_cubie = Cubie(self.cubie_type, new_colors)
        return new_cubie
