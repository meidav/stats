import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import flash, request, current_app

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def handle_errors(f):
    """Decorator to handle common errors in routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.error(f"ValueError in {f.__name__}: {e}")
            flash(f'Invalid input: {str(e)}', 'danger')
            return redirect(request.referrer or '/')
        except Exception as e:
            logger.error(f"Unexpected error in {f.__name__}: {e}")
            flash('An unexpected error occurred. Please try again.', 'danger')
            return redirect(request.referrer or '/')
    return decorated_function

def validate_game_data(winner1, winner2, loser1, loser2, winner_score, loser_score):
    """Validate game data with detailed error messages"""
    errors = []
    
    # Check for empty fields
    if not all([winner1, winner2, loser1, loser2, winner_score, loser_score]):
        errors.append("All fields are required")
    
    # Validate scores are numeric
    try:
        winner_score = int(winner_score)
        loser_score = int(loser_score)
    except (ValueError, TypeError):
        errors.append("Scores must be numeric")
        return errors, None, None
    
    # Validate score logic
    if winner_score <= loser_score:
        errors.append("Winner score must be greater than loser score")
    
    # Validate player uniqueness
    players = [winner1.strip(), winner2.strip(), loser1.strip(), loser2.strip()]
    if len(set(players)) < 4:
        errors.append("All players must be unique")
    
    # Validate reasonable score ranges (adjust as needed)
    if winner_score < 0 or loser_score < 0:
        errors.append("Scores cannot be negative")
    
    if winner_score > 50 or loser_score > 50:  # Adjust max as needed
        errors.append("Scores seem unusually high")
    
    return errors, winner_score, loser_score

def get_local_time(time_offset=-8):
    """Get local time with timezone offset"""
    utc_now = datetime.utcnow()
    local_time = utc_now + timedelta(hours=time_offset)
    return local_time

def calculate_minimum_games(total_games, delta=30):
    """Calculate minimum games for statistics with better logic"""
    if total_games == 0:
        return 1
    
    min_games = max(1, total_games // delta)
    
    # Ensure minimum games doesn't become too restrictive
    if min_games > total_games * 0.1:  # Max 10% of total games
        min_games = max(1, int(total_games * 0.1))
    
    return min_games

def format_percentage(wins, total):
    """Format win percentage with proper handling of edge cases"""
    if total == 0:
        return 0.0
    return round((wins / total) * 100, 1)

def sanitize_input(text):
    """Basic input sanitization"""
    if not text:
        return ""
    return text.strip()[:100]  # Limit length and strip whitespace
