#!/bin/bash

# Find all .zip files and unzip them into a 'data' directory within their respective directories
find . -name "*.zip" | while read -r filename; do
  unzip -o -d "$(dirname "$filename")/data" "$filename"
done