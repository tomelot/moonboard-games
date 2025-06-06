import logging
import string
import re

X_GRID_NAMES = string.ascii_uppercase[0:11]


def position_trans(p, num_rows):
    """convert led number (strip number) to moonboard grid"""
    col = p // num_rows
    row = (p % num_rows) + 1
    if col % 2 == 1:
        row = (num_rows + 1) - row
    return X_GRID_NAMES[col] + str(row)


def decode_problem_string(s, flags):
    holds = {"START": [], "MOVES": [], "TOP": [], "FLAGS": [flags]}

    if flags.find("M") != -1:
        num_rows = 12
    else:
        num_rows = 18

    for h in s.split(","):
        t, p = h[0], position_trans(int(h[1:]), num_rows)
        if t == "S":
            holds["START"].append(p)
        if t in ["P", "R"]:
            holds["MOVES"].append(p)
        if t == "E":
            holds["TOP"].append(p)
    return holds


def extract_and_replace(pattern, group_name, text):
    match = re.match(pattern, text)

    if match:
        problem = match.group(group_name)
        replaced_text = re.sub(pattern, "", text, count=1)
        return problem, replaced_text

    return None, text  # Return original text if no match is found


class UnstuffSequence:
    """
    hold sequence come separated in parts due to BLE packet size limitation
    this class serves to put different parts together
    """

    START = "l#"
    STOP = "#"

    def __init__(self, logger=None):
        if logger is None:
            self.logger = logging
        else:
            self.logger = logger
        self.s = ""
        self.flags = ""

    def process_bytes(self, ba):
        """
        process new incoming bytes and return if new problem is available.
        handle some error due to multiple connected devices sending simoultaneously.
        """
        self.s += ba.decode()

        flags, self.s = extract_and_replace(".*~(?P<flags>.*?)*.*", "problem", self.s)
        self.flags = flags or self.flags

        problem, self.s = extract_and_replace(".*l#(?P<problem>.*?)#.*", "problem", self.s)
        return problem
