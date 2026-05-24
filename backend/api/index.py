"""Vercel serverless entry point for FastAPI."""
import sys
from pathlib import Path

# Add parent directory to path so we can import server
sys.path.insert(0, str(Path(__file__).parent.parent))

from mangum import Mangum
from server import app

# Export handler for Vercel
handler = Mangum(app)
