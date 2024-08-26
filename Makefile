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

.PHONY: get-angled-device-coords
get-angled-device-coords:
	@python --version
	@python add_device_scripts/get_angled_device_coord.py

.PHONY: create-mask-image
create-mask-image:
	@python --version
	@python add_device_scripts/create_mask_image.py

.PHONY: add-new-device
add-new-device:
	@python --version
	@python add_device_scripts/add_device.py

.PHONY: dev
dev:
	npm run dev

.PHONY: start
start: dev

.PHONY: format
format:
	npm run format
	python3 -m black .

.PHONY: ci
ci:
	make check-format
	make lint_astro
	make bundle-python-linux

.PHONY: check-format
check-format:
	$(PYTHON_PREFIX) black --check .
	$(PYTHON_PREFIX) ruff .
	# TODO: upgrade prettier to 3.1 when it is available
	npx prettier --check "**/*" --ignore-unknown

# ref https://superuser.com/a/1170997
.PHONY: bundle-python
bundle-python:
	ditto -c -k --sequesterRsrc --keepParent ./mockup_package/mockup ./public/mockup.zip

.PHONY: bundle-python-linux
bundle-python-linux:
	mkdir -p tmp/mockup
	cp -r mockup_package/mockup/ tmp/mockup/
	cd tmp && \
	if [ -d "mockup" ]; then \
	  zip -r ../public/mockup mockup; \
	else \
	  echo "Error: Directory 'mockup' does not exist."; \
	  exit 1; \
	fi

.PHONY: lint_astro
lint_astro:
	python3 -m ruff .
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
