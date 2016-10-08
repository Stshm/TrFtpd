#!/bin/sh
openssl genrsa -out etc/tls-key.pem 1024

openssl req -new -key etc/tls-key.pem -out etc/tls-csr.pem

openssl x509 -req -in etc/tls-csr.pem -signkey etc/tls-key.pem -out etc/tls-cert.pem
