# Sports Statistics Tracker

A comprehensive Flask web application for tracking and analyzing sports game statistics across multiple game types.

## Features

- **Multi-sport support**: Main games, Vollis, Tennis, One-v-One, and Other games
- **Player statistics**: Win/loss records, win percentages, partner/opponent analysis
- **Team statistics**: Team performance tracking
- **Date range filtering**: View stats for specific time periods
- **Responsive web interface**: Clean, modern UI for data entry and viewing

## Game Types Supported

1. **Main Games** (4-player team games)
2. **Vollis** (1v1 games)
3. **Tennis** (1v1 matches)
4. **One-v-One** (Various 1v1 games with game type tracking)
5. **Other Games** (Miscellaneous games)
6. **Poker** (Session tracking with buy-ins/cash-outs)

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stats.git
   cd stats
   ```

2. **Set up virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   python migrate_db.py
   ```

6. **Run the application**
   ```bash
   python local.py
   ```

Visit `http://localhost:5000` to access the application.

### PythonAnywhere Deployment

See `deploy_setup.md` for detailed deployment instructions.

## Project Structure

```
stats/
├── stats.py                 # Main Flask application
├── config.py               # Configuration management
├── db_utils.py             # Database connection utilities
├── utils.py                # Helper functions and decorators
├── migrate_db.py           # Database migration script
├── local.py                # Local development runner
├── requirements.txt        # Python dependencies
├── deploy.sh              # Manual deployment script
├── 
├── database_functions.py   # Database operations
├── stat_functions.py       # Main game statistics
├── vollis_functions.py     # Vollis game functions
├── tennis_functions.py     # Tennis game functions
├── one_v_one_functions.py  # One-v-one game functions
├── other_functions.py      # Other game functions
├── 
├── templates/              # HTML templates
├── static/                 # CSS and static files
├── .github/workflows/      # GitHub Actions for auto-deployment
└── venv/                   # Virtual environment
```

## Database Schema

The application uses SQLite with the following main tables:

- `games` - Main 4-player team games
- `vollis` - Vollis game records
- `tennis` - Tennis match records
- `one_v_one` - One-on-one game records
- `other` - Other game types
- `poker` - Poker session records

## API Endpoints

### Main Game Routes
- `GET /` - Home page with current year stats
- `GET /stats/<year>/` - Stats for specific year
- `GET /games/` - View all games
- `POST /add_game/` - Add new game
- `GET/POST /edit_game/<id>/` - Edit existing game
- `POST /delete/<id>/` - Delete game

### Player Routes
- `GET /player/<year>/<name>` - Individual player statistics

### Similar routes exist for each game type (vollis, tennis, one_v_one, other)

## Configuration

Environment variables can be set in a `.env` file:

- `FLASK_ENV` - Environment (development/production)
- `DATABASE_PATH` - Production database path
- `TIME_OFFSET` - Timezone offset from UTC
- `MIN_DELTA` - Minimum games calculation factor

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Deployment

The application supports automated deployment to PythonAnywhere via GitHub Actions. See `deploy_setup.md` for setup instructions.

### Manual Deployment

For manual deployment on PythonAnywhere:

```bash
cd ~/stats
git pull origin main
./deploy.sh
```

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check database path in configuration
2. **Permission errors**: Ensure proper file permissions on PythonAnywhere
3. **Import errors**: Verify all dependencies are installed

### Logs

- Application logs are written to `app.log`
- Check PythonAnywhere error logs for deployment issues

## License

This project is for personal use. Modify as needed for your requirements.
