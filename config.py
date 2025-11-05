import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'b83880e869f054bfc465a6f46125ac715e7286ed25e88537'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Database settings
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'stats.db'
    DATABASE_PATH_LOCAL = os.environ.get('DATABASE_PATH_LOCAL') or 'stats.db'
    
    # Timezone settings
    TIME_OFFSET = int(os.environ.get('TIME_OFFSET', -8))
    
    # Game calculation settings
    MIN_DELTA = int(os.environ.get('MIN_DELTA', 30))
    MIN_DELTA_TEAMS = int(os.environ.get('MIN_DELTA_TEAMS', 50))
    MIN_DELTA_PLAYER = int(os.environ.get('MIN_DELTA_PLAYER', 40))

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DATABASE_PATH = 'stats.db'  # Use local database for development

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    DATABASE_PATH = 'stats.db'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_PATH = ':memory:'  # Use in-memory database for testing

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
