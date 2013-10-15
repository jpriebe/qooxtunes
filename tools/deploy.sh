#!/bin/sh

export ADDONS_DIR="/Users/priebe/Library/Application Support/XBMC/addons/webinterface.qooxtunes"

cp artwork/favicon.png "$ADDONS_DIR"
cp -r client/build/* "$ADDONS_DIR"

cp -r client/source "$ADDONS_DIR"

#### don't want to do this every time, but you need to do it once
#### if you want to run the source version
#cp -r client/qx "$ADDONS_DIR"

cp -r addon/*xml addon/*png "$ADDONS_DIR"
cp -r addon/resources "$ADDONS_DIR"
cp -r addon/python/* "$ADDONS_DIR"
cp -r addon/*png "$ADDONS_DIR"
