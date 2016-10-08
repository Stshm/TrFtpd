# TrFtpd
Ftp server application on NODE.JS

First, create public/private key, using OpenSSL command-line. 
On easy way, type below.

$:~/TrFtpd$sh mktlskey.sh

Default key files placement is [TrFtpRoot]/etc/

Run ftp server(default contorol port is 8021)

$:~/TrFtpd$node trftpd.js

Run Web admin interface

$:~/TrFtpd$node ftpwebadm.js

Run web browser, and access to https://localhost:9433 

Built in admin user/password is [admin/admin]
Built in guest user/password is [guest/guest]

