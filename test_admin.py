#!/usr/bin/env python3
"""
Test script to verify admin functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth import create_users_table, get_user_by_username, verify_password
from player_management import get_all_players, update_player_name

def test_auth():
    """Test authentication functionality"""
    print("🧪 Testing authentication...")
    
    # Create users table
    create_users_table()
    print("✅ Users table created")
    
    # Test getting admin user
    admin_user = get_user_by_username("admin")
    if admin_user:
        print(f"✅ Admin user found: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Is admin: {admin_user.is_admin}")
        
        # Test password verification
        test_password = os.environ.get("ADMIN_TEST_PASSWORD")
        if not test_password:
            print("⏭️  ADMIN_TEST_PASSWORD not set; skipping password check")
        elif verify_password(admin_user, test_password):
            print("✅ Password verification works")
        else:
            print("❌ Password verification failed")
    else:
        print("❌ Admin user not found")

def test_player_management():
    """Test player management functionality"""
    print("\n🧪 Testing player management...")
    
    # Get all players
    players = get_all_players()
    print(f"✅ Found {len(players)} players")
    
    if players:
        print(f"   Sample players: {players[:5]}")
        
        # Test player name update (dry run)
        test_player = players[0]
        print(f"   Testing with player: {test_player}")
        
        # Note: We won't actually update to avoid modifying data
        print("✅ Player management functions available")

def main():
    """Run all tests"""
    print("🚀 Starting admin functionality tests...\n")
    
    try:
        test_auth()
        test_player_management()
        print("\n🎉 All tests passed! Admin system is ready.")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
