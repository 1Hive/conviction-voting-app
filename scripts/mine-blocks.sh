#!/bin/bash

devchain() {
  npx aragon devchain -b 15 --silent
}

kill_all () {
  echo Stoping devchain and client…
  fuser -k 8545/tcp --silent
  fuser -k 3000/tcp --silent
  exit 0
}

# Kill all on Ctrl+C, including our own exit.
trap kill_all INT

echo Stoping already running devchain…
fuser -k 8545/tcp --silent

echo Starting devchain…
devchain &
npx wait-on tcp:8545 && echo Devchain started: 1 block mined each 15s:
echo -n "⛏️ "
while :
  do
    echo -n "\b\b🧱⛏️ "
    sleep 15
  done
