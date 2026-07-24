#!/bin/bash
# VPS 작업 중 락 파일
if [ -f /tmp/telemon-vps.lock ]; then
  echo "VPS already locked by PID $(cat /tmp/telemon-vps.lock)"
  exit 1
fi
echo $$ > /tmp/telemon-vps.lock
trap 'rm -f /tmp/telemon-vps.lock' EXIT