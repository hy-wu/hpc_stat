#!/usr/bin/env bash
# setup-dsh.sh — 国内云服务器一键安装并启动 DeepSeek Harness (DSH)
#
# 用法:
#   bash setup-dsh.sh                                  # 默认 workspace=~/dsh-workspace, 端口 3080
#   WORKSPACE=/your/project DSH_PORT=8080 bash setup-dsh.sh
#
# 说明:
#   - nvm 优先走 gitee 镜像(国内最稳),失败回退官方 install.sh(需能访问 github)
#   - Node 22 / npm 均走国内镜像;DSH 依赖要求 Node >=22.19.0
#   - API Key 不在此配置:启动后在浏览器 GUI 的 Models 页面手动填入
set -euo pipefail

WORKSPACE="${WORKSPACE:-$HOME/dsh-workspace}"
DSH_PORT="${DSH_PORT:-3080}"
NVM_VERSION="v0.40.6"
NVM_GITEE="https://gitee.com/mirrors/nvm.git"
NVM_GH_INSTALL="https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh"
NODE_MIRROR="https://npmmirror.com/mirrors/node"
NPM_REGISTRY="https://registry.npmmirror.com"

export NVM_DIR="$HOME/.nvm"

# ---------- 1/4 nvm ----------
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "==> [1/4] 安装 nvm ${NVM_VERSION}(优先 gitee 镜像)"
  if   git clone --branch "$NVM_VERSION" --depth 1 "$NVM_GITEE" "$NVM_DIR" 2>/dev/null; then
    :
  elif rm -rf "$NVM_DIR" && git clone --depth 1 "$NVM_GITEE" "$NVM_DIR" 2>/dev/null; then
    :
  else
    rm -rf "$NVM_DIR"
    curl -fsSL "$NVM_GH_INSTALL" | bash
  fi
fi
# nvm 是 shell 函数,必须 source 才能在当前 shell 使用
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ---------- 2/4 Node 22 ----------
echo "==> [2/4] 安装 Node 22(国内镜像)"
export NVM_NODEJS_ORG_MIRROR="$NODE_MIRROR"
nvm install 22
nvm alias default 22 >/dev/null
nvm use default >/dev/null
echo "    node $(node -v) / npm $(npm -v)"

# ---------- 3/4 DSH ----------
echo "==> [3/4] 安装 @deepseek-ai/dsh(国内 npm 源)"
npm config set registry "$NPM_REGISTRY"
npm install -g @deepseek-ai/dsh

# ---------- 4/4 启动 ----------
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"
echo "==> [4/4] 启动 dsh web"
echo "    workspace = $WORKSPACE"
echo "    监听      = 127.0.0.1:$DSH_PORT"
echo "    API Key   = 启动后在浏览器 GUI 的 Models 页面填入"
echo "    本机访问  = ssh -L 3081:127.0.0.1:$DSH_PORT \${USER}@<server_ip>, 再开 http://127.0.0.1:3081"
echo "------------------------------------------------------------"
exec dsh web --port "$DSH_PORT"
