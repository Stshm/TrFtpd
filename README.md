# TrFtpd
Ftp server application

First, create public/private key, using OpenSSL command-line. 
On easy way, type below.

$:~/TrFtpd$./mktlskey.sh

Default key files placement is [TrFtpRoot]/etc/

Run ftp server(default contorol port is 8012)

$:~/TrFtpd$node trftpd.js

Run Web admin interface

$:~/TrFtpd$node ftpwebadm.js

Run web browser, and access to https://localhost:9433 


