import sys
import os
from logging.config import fileConfig
from pathlib import Path

# backend/ 를 sys.path에 추가해 app 임포트 가능하게
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import engine_from_config, pool
from alembic import context

# app 모델 메타데이터 임포트
from app.db.models import *  # noqa — SQLModel 모델 등록
from sqlmodel import SQLModel

# .env 로드
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# .env 의 DATABASE_URL 을 동기 드라이버로 변환 (Alembic은 sync 사용)
db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/365dash")
# asyncpg → psycopg2 (alembic은 sync 드라이버 필요)
sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
config.set_main_option("sqlalchemy.url", sync_url)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
