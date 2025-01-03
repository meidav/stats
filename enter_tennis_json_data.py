from datetime import date, datetime
from create_tennis_database import *
import json


def stats_from_json():
	json_file = open('tennis_stats.json')
	stats = json.load(json_file)
	json_file.close()
	return stats

def enter_data_into_database(matches_data):
	for x in matches_data:
		new_tennis_match(x[4], x[2], 0, x[3], 0, x[4])

def new_tennis_match(match_date, winner, winner_score, loser, loser_score, updated_at):
	database = '/home/Idynkydnk/stats/stats.db'
	conn = create_connection(database)
	if conn is None:
		database = r'stats.db'
		conn = create_connection(database)
	with conn: 
		match = (match_date, winner, winner_score, loser, loser_score, updated_at);
		create_tennis_match(conn, match)


def main():
	enter_data_into_database(stats_from_json())


if __name__ == '__main__':
	main()



