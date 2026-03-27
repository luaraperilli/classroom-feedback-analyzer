from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt


def requires_role(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') not in roles:
                return jsonify({'message': 'Acesso negado.'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
