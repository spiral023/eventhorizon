import random
import string

_ALLOWED_SHORT_CODE_CHARS = ''.join(set(string.ascii_uppercase + string.digits) - {'O', '0', 'I', '1'})


def _generate_short_code() -> str:
    """Generate a random code in format XXX-XXX-XXX using the allowed character set."""
    return '-'.join(
        ''.join(random.choice(_ALLOWED_SHORT_CODE_CHARS) for _ in range(3))
        for _ in range(3)
    )


def generate_room_invite_code() -> str:
    """
    Generate a random room invite code in format XXX-XXX-XXX.
    Excludes O, 0, I, 1 to avoid confusion.
    """
    return _generate_short_code()


def generate_event_short_code() -> str:
    """
    Generate a random event short code in format XXX-XXX-XXX.
    Shares the same character rules as room invite codes.
    """
    return _generate_short_code()
