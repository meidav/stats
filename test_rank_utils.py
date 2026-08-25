import unittest

from api.rank_utils import competition_ranks, pair_rank_key, player_rank_in_rows, standings_rank_key


class RankUtilsTests(unittest.TestCase):
    def test_occasional_standings_ties(self):
        rows = [
            {"player": "Justin", "win_pct": 1.0, "wins": 10, "plus_minus": 50},
            {"player": "Chris", "win_pct": 1.0, "wins": 7, "plus_minus": 35},
            {"player": "Andor", "win_pct": 1.0, "wins": 5, "plus_minus": 25},
            {"player": "Weston", "win_pct": 1.0, "wins": 4, "plus_minus": 20},
            {"player": "Brian", "win_pct": 1.0, "wins": 4, "plus_minus": 18},
            {"player": "Duncan", "win_pct": 1.0, "wins": 3, "plus_minus": 15},
            {"player": "Carter", "win_pct": 1.0, "wins": 3, "plus_minus": 14},
            {"player": "Max", "win_pct": 1.0, "wins": 3, "plus_minus": 13},
            {"player": "Matthew", "win_pct": 1.0, "wins": 3, "plus_minus": 12},
            {"player": "Liam", "win_pct": 1.0, "wins": 3, "plus_minus": 11},
            {"player": "Jorge", "win_pct": 1.0, "wins": 2, "plus_minus": 10},
            {"player": "Oren", "win_pct": 1.0, "wins": 2, "plus_minus": 8},
        ]
        ranks = competition_ranks(rows, standings_rank_key)
        self.assertEqual(ranks, [1, 2, 3, 4, 4, 6, 6, 6, 6, 6, 11, 11])

    def test_player_rank_uses_qualified_list_only(self):
        qualified = [
            {"player": "Joe", "win_pct": 0.73, "wins": 176, "plus_minus": 695},
            {"player": "Other", "win_pct": 0.70, "wins": 100, "plus_minus": 200},
        ]
        rank, field_size = player_rank_in_rows(qualified, "Joe")
        self.assertEqual(rank, 1)
        self.assertEqual(field_size, 2)
        rank, field_size = player_rank_in_rows(qualified, "Missing")
        self.assertIsNone(rank)
        self.assertEqual(field_size, 2)

    def test_pair_rank_ties(self):
        rows = [
            {"player": "A", "win_pct": 0.92, "wins": 23, "games": 25},
            {"player": "B", "win_pct": 0.60, "wins": 36, "games": 60},
            {"player": "C", "win_pct": 0.60, "wins": 24, "games": 40},
        ]
        ranks = competition_ranks(rows, pair_rank_key)
        self.assertEqual(ranks, [1, 2, 3])


if __name__ == "__main__":
    unittest.main()
