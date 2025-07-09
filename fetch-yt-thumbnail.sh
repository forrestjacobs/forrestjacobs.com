#!/usr/bin/env bash

yt-dlp --write-thumbnail -o "thumbnail:%(id)s.%(ext)s" --skip-download "$1"

metadata="$(yt-dlp --print "title=%(title)j channel=%(channel)j" --skip-download "$1")"

echo "Move the thumbnail to your page's directory, then add this shortcode to your page:"
echo "{{< youtube id=$1 $metadata >}}"
