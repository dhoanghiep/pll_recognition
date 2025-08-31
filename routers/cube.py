from fastapi import APIRouter, HTTPException
from cube import Cube
from cube.common import reverse_moves
from models.cube import Move, Plot, PLLRequest
import os


router = APIRouter()


def load_pll_data():
    """Load PLL algorithms from database file."""
    pll_data = {}
    
    # Get the path to the PLL.txt file (relative to project root)
    pll_file = os.path.join(os.getcwd(), "db", "PLL.txt")
    
    try:
        with open(pll_file, 'r') as f:
            lines = f.readlines()[1:]  # Skip header
            for line in lines:
                line = line.strip()
                if line:  # Skip empty lines
                    # Split on first whitespace(s) to separate PLL name from algorithm
                    parts = line.split(None, 1)  # Split on any whitespace, max 1 split
                    if len(parts) >= 2:
                        pll_name = parts[0].strip()
                        algorithm = parts[1].strip()
                        pll_data[pll_name] = algorithm
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="PLL database file not found")
    
    return pll_data


@router.post("/get_plot", response_model=Plot)
def get_plot(moves: Move):
    """Generate cube plot from move sequence."""
    cube = Cube()
    cube.rotate(moves.moves)
    return Plot(plot=cube.plot_to_base64(elev=moves.elev, azim=moves.azim))


@router.post("/get_pll_plot", response_model=Plot)
def get_pll_plot(pll_request: PLLRequest):
    """Generate cube plot for PLL case using reversed algorithm."""
    pll_data = load_pll_data()
    
    pll_name = pll_request.pll_name.strip()
    
    if pll_name not in pll_data:
        available_plls = list(pll_data.keys())
        raise HTTPException(
            status_code=404, 
            detail=f"PLL '{pll_name}' not found. Available PLLs: {available_plls}"
        )
    
    # Get the algorithm and reverse it
    algorithm = pll_data[pll_name]
    reversed_algorithm = reverse_moves(algorithm)
    
    # Create cube and apply reversed algorithm
    cube = Cube()
    cube.rotate("x2")
    cube.rotate(reversed_algorithm)
    
    return Plot(plot=cube.plot_to_base64(elev=pll_request.elev, azim=pll_request.azim))


@router.get("/pll_list")
def get_pll_list():
    """Get list of available PLL cases."""
    pll_data = load_pll_data()
    return {"pll_cases": list(pll_data.keys())}
