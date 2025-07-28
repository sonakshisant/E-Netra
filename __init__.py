from flask import Blueprint

interpreter_bp = Blueprint('interpreter', __name__)

from src.routes.interpreter import routes
