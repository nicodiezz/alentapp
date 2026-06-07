#!/bin/bash

for i in {1..1000}; do
 curl -s http://localhost:3000/api/v1/socios > /dev/null
 curl -s http://localhost:3000/api/v1/sports > /dev/null
 curl -s http://localhost:3000/api/v1/lockers > /dev/null
 curl -s http://localhost:3000/api/v1/socios/99999 > /dev/null
 sleep 0.05
done