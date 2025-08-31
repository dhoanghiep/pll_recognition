# --------------------------------------------------------------
# Step 3 – Cube class + .plot() implementation
# --------------------------------------------------------------

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# Import the Cubie class from Step 2
# (Assume it lives in the same file or has been imported earlier)

from .constants import FACE_U, FACE_D, FACE_F, FACE_B, FACE_R, FACE_L
from .cubie import Cubie, CubieType


class Cube:
    """
    A Rubik’s Cube representation that can be plotted in 3‑D.
    """

    def __init__(self, cubies=None):
        """
        Parameters
        ----------
        cubies : Iterable[Cubie], optional
            If omitted, a solved cube is created.
        """
        if cubies is None:
            self.cubies = self._create_solved_cube()
        else:
            self.cubies = list(cubies)

    # ----------------------------------------------------------
    def _create_solved_cube(self) -> list:
        """Return a solved cube (20 cubies)."""

        # Helper to create a cubie with given parameters
        def make(c_type, colors):
            return Cubie(cubie_type=c_type, colors=colors)

        cubies = []

        # Centers (6)
        centers_info = {
            FACE_U: {"U": "white"},
            FACE_D: {"D": "yellow"},
            FACE_F: {"F": "green"},
            FACE_B: {"B": "blue"},
            FACE_R: {"R": "red"},
            FACE_L: {"L": "orange"},
        }
        for face, (colors) in centers_info.items():
            cubies.append(make(CubieType.CENTER, colors))

        # Edges (12)
        edges_info = [
            ({"R": "red", "F": "green"}),
            ({"L": "orange", "F": "green"}),
            ({"L": "orange", "B": "blue"}),
            ({"R": "red", "B": "blue"}),
            ({"U": "white", "F": "green"}),
            ({"D": "yellow", "F": "green"}),
            ({"D": "yellow", "B": "blue"}),
            ({"U": "white", "B": "blue"}),
            ({"U": "white", "R": "red"}),
            ({"U": "white", "L": "orange"}),
            ({"D": "yellow", "L": "orange"}),
            ({"D": "yellow", "R": "red"}),
        ]
        for colors in edges_info:
            cubies.append(make(CubieType.EDGE, colors))

        # Corners (8)
        corners_info = [
            ({"U": "white", "R": "red", "F": "green"}),
            ({"U": "white", "L": "orange", "F": "green"}),
            ({"U": "white", "L": "orange", "B": "blue"}),
            ({"U": "white", "R": "red", "B": "blue"}),
            ({"D": "yellow", "R": "red", "F": "green"}),
            ({"D": "yellow", "L": "orange", "F": "green"}),
            ({"D": "yellow", "L": "orange", "B": "blue"}),
            ({"D": "yellow", "R": "red", "B": "blue"}),
        ]
        for colors in corners_info:
            cubies.append(make(CubieType.CORNER, colors))

        return cubies

    # ----------------------------------------------------------
    def plot(self, ax=None, scale=1.0, elev=30, azim=45):
        """
        Render the cube in a 3‑D Matplotlib figure.

        Parameters
        ----------
        ax : matplotlib.axes._subplots.Axes3DSubplot, optional
            If supplied, plot onto this axes. Otherwise a new figure is created.
        scale : float
            Size multiplier for the cube (default 1.0).
        """
        if ax is None:
            fig = plt.figure(figsize=(6, 6))
            ax = fig.add_subplot(111, projection="3d")

        # Helper: cube vertices centered at (x,y,z)
        def _cube_vertices(x, y, z, size):
            s = size / 2
            return [
                [x - s, y - s, z - s],
                [x + s, y - s, z - s],
                [x + s, y + s, z - s],
                [x - s, y + s, z - s],
                [x - s, y - s, z + s],
                [x + s, y - s, z + s],
                [x + s, y + s, z + s],
                [x - s, y + s, z + s],
            ]

        # Faces of a cube in terms of vertex indices
        faces = [
            [0, 1, 2, 3],  # -Z (down)
            [4, 5, 6, 7],  # +Z (up)
            [0, 1, 5, 4],  # -Y (left)
            [2, 3, 7, 6],  # +Y (right)
            [0, 3, 7, 4],  # -X (back)
            [1, 2, 6, 5],  # +X (front)
        ]

        size = 0.99 * scale  # Slightly smaller than the unit cube

        for cubie in self.cubies:
            x, y, z = cubie.position
            verts = _cube_vertices(x * scale, y * scale, z * scale, size)

            # Map the 6 faces to colors (if a face is not present -> gray)
            face_colors = []
            for i, f in enumerate(faces):
                # Determine which real cube face this corresponds to
                # (use normal vector of the face)
                normal = None
                if i == 0:
                    normal = (0, 0, -1)  # down -> -Z
                if i == 1:
                    normal = (0, 0, 1)  # up -> +Z
                if i == 2:
                    normal = (0, -1, 0)  # left -> -Y
                if i == 3:
                    normal = (0, 1, 0)  # right -> +Y
                if i == 4:
                    normal = (-1, 0, 0)  # back -> -X
                if i == 5:
                    normal = (1, 0, 0)  # front -> +X

                face_letter = None
                if normal == (0, 1, 0):
                    face_letter = FACE_R
                if normal == (0, -1, 0):
                    face_letter = FACE_L
                if normal == (0, 0, 1):
                    face_letter = FACE_U
                if normal == (0, 0, -1):
                    face_letter = FACE_D
                if normal == (1, 0, 0):
                    face_letter = FACE_F
                if normal == (-1, 0, 0):
                    face_letter = FACE_B

                # Get the color from cubie.colors if present
                col = cubie.colors.get(face_letter, "#CCCCCC")  # light gray for hidden
                face_colors.append(col)

            cube_poly = Poly3DCollection(
                [[verts[v] for v in f] for f in faces],
                facecolors=face_colors,
                linewidths=0.5,
                edgecolor="black",
            )
            ax.add_collection3d(cube_poly)

        # Hide the axes ticks for a cleaner look
        ax.set_xticks([])
        ax.set_yticks([])
        ax.set_zticks([])
        ax.set_axis_off()
        ax.view_init(elev=elev, azim=azim)
        # Add a title
        ax.set_title("Rubik’s Cube (3‑D View)", fontsize=14)

        return ax

    def plot_to_base64(self, scale=1.0, elev=30, azim=45):
        """Generate a base64 encoded PNG image of the cube."""
        import io
        import base64
        
        fig = plt.figure(figsize=(6, 6))
        ax = fig.add_subplot(111, projection="3d")
        
        self.plot(ax=ax, scale=scale, elev=elev, azim=azim)
        
        # Save plot to bytes buffer
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight', dpi=100)
        img_buffer.seek(0)
        
        # Encode to base64
        img_str = base64.b64encode(img_buffer.read()).decode('utf-8')
        plt.close(fig)  # Important: close figure to free memory
        
        return img_str

    def rotate(self, moves):
        for move in moves.split():
            self.cubies = [cubie.rotate(move) for cubie in self.cubies]
