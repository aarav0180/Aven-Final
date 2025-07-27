import random
import string

def generate_jitsi_meet_link():
    """
    Generate a unique Jitsi Meet link for a free online meeting.
    Returns:
        str: The Jitsi Meet meeting URL.
    """
    room = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    return f"https://meet.jit.si/{room}" 