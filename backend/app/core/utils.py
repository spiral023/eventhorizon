import random
import string

def generate_room_invite_code() -> str:
    """
    Generate a random room invite code in format XXX-XXX-XXX.
    Excludes O, 0, I, 1 to avoid confusion.
    """
    # Allowed characters: A-Z and 2-9 (excluding O, 0, I, 1)
    allowed_chars = ''.join(set(string.ascii_uppercase + string.digits) - {'O', '0', 'I', '1'})

    # Generate three groups of 3 characters
    code_parts = []
    for _ in range(3):
        part = ''.join(random.choice(allowed_chars) for _ in range(3))
        code_parts.append(part)

    return '-'.join(code_parts)
