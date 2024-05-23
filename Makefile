##################################
# development
##################################

PYTHON_PREFIX := python3 -m
PAGESHIP_API := https://api.pages.oursky.app

ifeq ($(GITHUB_REF_NAME),production)
ENV ?= $(GITHUB_REF_NAME)
else
ENV ?= staging
endif

ifeq (${ACTIONS_ID_TOKEN_REQUEST_URL},)
# interactive mode
ARGS=-it
else
ARGS=-e ACTIONS_ID_TOKEN_REQUEST_URL=${ACTIONS_ID_TOKEN_REQUEST_URL} \
	 -e ACTIONS_ID_TOKEN_REQUEST_TOKEN=${ACTIONS_ID_TOKEN_REQUEST_TOKEN}
DEPLOYMENT=github-action
endif

pageship=docker run --rm \
		-e PAGESHIP_API="${PAGESHIP_API}" \
		-v "${PWD}/pageship_config/:/root/.config/pageship/" \
		-v "${PWD}:/var/pageship" \
		${ARGS} \
		ghcr.io/oursky/pageship:v0.5.1

.PHONY: dev
dev:
	npm run dev

.PHONY: start
start: dev

.PHONY: format
format:
	npm run format

.PHONY: ci
ci:
	make check-format
	make lint_astro

.PHONY: check-format
check-format:
	$(PYTHON_PREFIX) black --check .
	$(PYTHON_PREFIX) ruff .
	# TODO: upgrade prettier to 3.1 when it is available
	npx prettier --check "**/*" --ignore-unknown

.PHONY: lint_astro
lint_astro:
	npx eslint --ext .js,.astro src
	npx astro check
	npx tsc --noEmit

.PHONY: build
build:
	npm run build

.PHONY: pageship_config
pageship_config:
	@${pageship} config reset
	@echo "Ensure to copy your github ssh key to '${PWD}/pageship_config/id_rsa' before setup"
	@echo -e "and specify SSH key file input in following steps with: /root/.config/pageship/id_rsa"
	@${pageship} login

.PHONY: deploy
deploy:
	@if [ "${DEPLOYMENT}" = "github-action" ] ||\
		[ -e ${PWD}/pageship_config/id_rsa ] ||\
		[ -e ${PWD}/pageship_config/client.json ]; then \
		cp pageship.${ENV}.toml pageship.toml; \
		${pageship} deploy /var/pageship --site main -y; \
	else \
	  echo "Essential config not found. Please run \"make pageship_config\" before deployment"; \
	fi
