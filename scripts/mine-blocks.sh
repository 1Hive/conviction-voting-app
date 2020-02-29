#!/usr/bin/env bash
pid=$(pgrep -f "aragon devchain" | tail -1)
if [ -n "$pid" ]
then
  echo Stoping already running devchain…
  kill -9 $pid
fi
echo Starting devchain…
npx aragon devchain -b 15 --network-id 15
