from alembic.config import Config
from alembic import command
cfg = Config('/app/alembic.ini')
command.stamp(cfg, 'add_inline_buttons')
print('stamped')
