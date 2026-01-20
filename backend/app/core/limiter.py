from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize Limiter with key function (remote address by default)
limiter = Limiter(key_func=get_remote_address)
