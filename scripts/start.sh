#!/usr/bin/env bash

# 'ipfs' or 'http'
MODE=$1
echo Running app in MODE: \"$MODE\"

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the RPC instance that we started (if we started one and if it's still running).
  if [ -n "$pid" ] && pgrep -f $pid > /dev/null; then
    kill -9 $pid
  fi
}

compileContracts() {
  echo Compiling contracts 
  npx truffle compile > /dev/null
}

startDevchain() {
  pid=$(pgrep -f "aragon devchain" | tail -1)
  if [ -z "$pid" ] 
  then
    echo Starting devchain
    npx aragon devchain --verbose > /dev/null &
    pid=$!
    sleep 3
    echo Running devchain with pid ${pid}
  else
    echo Devchain already running [skipped]
  fi
}

deployToken() {
  echo Deploying token
  RESPONSE=$(npx truffle exec ./scripts/deployToken.js "Dai Stablecoin" "DAI" 18)
  REQUEST_TOKEN=$(echo "${RESPONSE}" | tail -1)
  echo Request token: ${REQUEST_TOKEN}
}

runUsingTemplateIPFS() {
  npx aragon run --template Template --template-init @ARAGON_ENS --template-args "App token" 0 "APP" ${REQUEST_TOKEN} --files dist
}

runUsingTemplateHTTP() {
  npx aragon run --http localhost:8001 --http-served-from ./dist --template Template --template-init @ARAGON_ENS --template-args "App token" 0 "APP" ${REQUEST_TOKEN} 
}

compileContracts
startDevchain
deployToken

if [ $MODE == 'ipfs' ]
then
  runUsingTemplateIPFS
elif [ $MODE == 'http' ]
then
  runUsingTemplateHTTP
else
  echo ERROR: Unrecognized mode \"$MODE\". Please specify 'ipfs' or 'http'.
fi