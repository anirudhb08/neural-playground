# A PyTorch runner for the tutorials at learn.welldun.ai, deployable anywhere
# that builds a Dockerfile. On Railway: New Project → Deploy from GitHub repo →
# set Root Directory to public/runner.
#
# The CPU wheel, deliberately. Nothing in these tutorials is large enough for a
# GPU to help — the model in the transformer parts has a few thousand
# parameters, where moving them to a card costs more than the arithmetic saves.
# The CUDA build is several gigabytes and would make the image slow to deploy
# and more expensive to keep, in exchange for nothing.
FROM python:3.12-slim

RUN pip install --no-cache-dir \
      --index-url https://download.pytorch.org/whl/cpu \
      torch

WORKDIR /app
COPY welldun_runner.py .

# No CMD arguments: the runner reads PORT to decide it is hosted, binds
# 0.0.0.0 for it, and refuses to start unless WELLDUN_TOKEN is set. Set that
# as a service variable before the first deploy.
CMD ["python", "-u", "welldun_runner.py"]
