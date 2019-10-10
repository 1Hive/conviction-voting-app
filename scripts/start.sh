#!/usr/bin/env bash

# 'ipfs' or 'http'
MODE=$1
echo Running app in MODE: \"$MODE\"

# Exit script as soon as a command fails.
set -o errexit

startDevchain() {
  echo Starting devchain
  npx aragon devchain --verbose > /dev/null &
  pid=$!
  sleep 3
  echo Running devchain with pid ${pid}
}

deployToken() {
  echo Deploying token
  RESPONSE=$(npx truffle exec ./scripts/deployToken.js "Dai Stablecoin" "DAI")
  REQUEST_TOKEN=$(echo "${RESPONSE}" | tail -1)
  echo Request token: ${REQUEST_TOKEN}
}

runUsingTemplateIPFS() {
  npx aragon run --template Template --template-init @ARAGON_ENS --template-args ${REQUEST_TOKEN} --files dist
}

runUsingTemplateHTTP() {
  npx aragon run --http localhost:8001 --http-served-from ./dist --template Template --template-init @ARAGON_ENS --template-args ${REQUEST_TOKEN}
}

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