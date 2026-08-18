import re


def validate_name(name: str):
    pattern = r"^[A-Za-z ]+$"

    return bool(re.match(pattern, name))