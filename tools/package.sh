#!/bin/sh

#### NOTE: you must run this from the qooxtunes project root!

ROOT_DIR=/tmp/webinterface.qooxtunes

mkdir $ROOT_DIR || exit
mkdir $ROOT_DIR/jsonrpclib

cd client
./generate.py build
cd ..

cp client/build/index.html $ROOT_DIR
cp -r client/build/script $ROOT_DIR
cp -r client/build/resource $ROOT_DIR
cp artwork/favicon.png $ROOT_DIR

cp addon/python/*.py $ROOT_DIR
cp addon/python/jsonrpclib/*.py $ROOT_DIR/jsonrpclib
cp -r addon/resources $ROOT_DIR

cp addon/icon.png $ROOT_DIR
cp addon/addon.xml $ROOT_DIR
cp addon/LICENSE.txt $ROOT_DIR

cd /tmp
zip -r webinterface.qooxtunes-1.1.0.zip webinterface.qooxtunes
