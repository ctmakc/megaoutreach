.PHONY: help install dev prod down logs test lint format migrate seed clean

help:
	@echo "SalesPilot - Available commands:"
	@echo ""
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Start development environment"
	@echo "  make prod       - Start production environment"
	@echo "  make down       - Stop all containers"
	@echo "  make logs       - View container logs"
	@echo "  make test       - Run tests"
	@echo "  make lint       - Run linters"
	@echo "  make format     - Format code"
	@echo "  make migrate    - Run database migrations"
	@echo "  make seed       - Seed database with sample data"
	@echo "  make clean      - Remove all containers and volumes"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev:
	docker-compose up -d
	@echo ""
	@echo "SalesPilot is starting..."
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"
	@echo "Flower:   http://localhost:5555"
	@echo ""

prod:
	docker-compose -f docker-compose.prod.yml up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-worker:
	docker-compose logs -f celery-worker

test:
	cd backend && pytest -v
	cd frontend && npm test

test-backend:
	cd backend && pytest -v --cov=app --cov-report=html

test-frontend:
	cd frontend && npm test -- --coverage

lint:
	cd backend && ruff check app
	cd frontend && npm run lint

format:
	cd backend && ruff format app
	cd frontend && npm run format

migrate:
	docker-compose exec backend alembic upgrade head

migrate-create:
	docker-compose exec backend alembic revision --autogenerate -m "$(msg)"

seed:
	docker-compose exec backend python -m app.scripts.seed_data

shell-backend:
	docker-compose exec backend bash

shell-db:
	docker-compose exec postgres psql -U salespilot -d salespilot

clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d