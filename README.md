# TrFtpd
Ftp server application on NODE.JS

### Install  
Decompress archive , keeping directory strucuture, and move the program directory.

First, create public/private key, using OpenSSL command-line. On easy way, type below.

$sh ./mktlskey.sh

Default key files placement is [TrFtpRoot]/etc/

To run ftp server(default contorol port is 8021)

$node trftpd.js

To run Web admin interface

$node ftpwebadm.js

Run web browser, and access to https://localhost:9433

Built in admin user/password is [admin/admin] Built in guest user/password is [guest/guest]

Note:
In default configuration, path is specified relatively.



