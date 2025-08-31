class Move:
    base_rotation = {
        "RLXM": ["U", "B", "D", "F"],
        "UDYE": ["F", "L", "B", "R"],
        "FBZS": ["U", "R", "D", "L"],
    }

    def __init__(self, move):
        self.move = move
        if move.endswith("2") or move.endswith("2'"):
            self.direction = 2
        elif move.endswith("'"):
            self.direction = -1
        else:
            self.direction = 1
        if move[0] in ["xyz"]:
            self.move_type = "coordinate_rotation"
        else:
            self.move_type = "face_rotation"

    @property
    def rotation_loop(self):
        if self.move[0].upper() in "UDYE":
            base_rot = self.base_rotation["UDYE"]
        elif self.move[0].upper() in "RLXM":
            base_rot = self.base_rotation["RLXM"]
        elif self.move[0].upper() in "FBZS":
            base_rot = self.base_rotation["FBZS"]
        loop = {}
        for i in range(len(base_rot)):
            if self.move[0].upper() in "URFXYZMES":
                loop[base_rot[i]] = base_rot[(i + self.direction) % 4]
            else:
                loop[base_rot[i]] = base_rot[(i - self.direction) % 4]
        return loop


def _reverse_move(move):
    if move.endswith("2") or move.endswith("2'"):
        return move
    elif move.endswith("'"):
        return move[0]
    else:
        return move[0] + "'"


def reverse_moves(moves):
    return " ".join([_reverse_move(move) for move in moves.split()][::-1])
