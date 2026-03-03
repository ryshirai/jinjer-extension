# ===== 1. Base Stage: 共通のツールチェーン =====
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04 AS base

ARG USER_UID=1000
ARG USER_GID=$USER_UID
ARG USERNAME=vscode

USER root
# 既存の1000番を、指定されたUID（1002など）に変更する
RUN if [ "$USER_UID" != "1000" ]; then \
    groupmod --gid $USER_GID vscode \
    && usermod --uid $USER_UID --gid $USER_GID vscode \
    && chown -R $USER_UID:$USER_GID /home/vscode; \
    fi

# 基本ツール (git, ripgrep, jqなど) [cite: 2]
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config curl git ca-certificates unzip \
    python3 python3-pip ripgrep jq postgresql-client-16 gh \
    && rm -rf /var/lib/apt/lists/*

# Node.js (20.x LTS) & corepack [cite: 3]
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable \
    && rm -rf /var/lib/apt/lists/*

# ===== 2. Dev Stage: 人間用 =====
FROM base AS dev
WORKDIR /workspace

# ===== 3. AI Stage: AIエージェント用 =====
FROM base AS ai
USER root
# AI用の追加ツールをインストール (Codex)
RUN npm i -g @openai/codex@latest @google/gemini-cli

USER ${USERNAME}
WORKDIR /workspace