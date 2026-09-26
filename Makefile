.PHONY: install build dev-dashboard dev-sample-app analyze generate report test lint clean docker-up docker-down

install:
	npm install

build:
	npm run build --workspace=engine

dev-dashboard:
	npm run dev --workspace=dashboard

dev-sample-app:
	npm run dev --workspace=sample-app

analyze:
	npx testforge analyze ./sample-app

generate:
	npx testforge generate ./sample-app

report:
	npx testforge report ./sample-app

test:
	npm run test --workspaces --if-present

lint:
	npx eslint . --ext .ts,.tsx,.js

clean:
	rm -rf engine/dist dashboard/dist engine/node_modules dashboard/node_modules sample-app/node_modules

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
