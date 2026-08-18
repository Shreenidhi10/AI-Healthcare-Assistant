messages = []


def save_message(data):
    messages.append(data)
    return True


def get_messages():
    return messages