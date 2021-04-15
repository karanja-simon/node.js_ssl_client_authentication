# node.js_ssl_client_authentication
## SSL Clients Authentication
##### *RESTful API clients authentication via client certificates*
###### [@admin](/whoami)
###### Mar 14, 2021 12:20PM
###### [#ssl]() [#rest]()

In traditional RESTful systems, authentication is quite straight-forward. A client registers in the platform and then uses these credentials stored on the platform to authenticate themselves. Now, what if you don't have a prior knowledge of a client, i.e the client doesn't exist on your platform? How would you know a genuine client vs a malicious one? The answer lies on ssl client certificates.

#### SSL Mutual Authentication 
For the most part, SSL is used that to facilitate encryption and establish trust between clients and web browsers. This is the basic SSL authentication i.e, the server presents a certificate that the client verifies against its trusted certificate authorities. Whilst this is what is known by most 
people, SSL can be use to authenticate clients, called SSL mutual authetication. Generally the above applies, but in addition, the server challenges the client to provide a certificate during the TLS handshake. This in turn forces the client to provide a valid certificate before the server can provide any resource. We can implement our custom checks here to see if the incoming certificate is valid and grant access, otherwise deny.

| ![SSL Mutual Authentication](/images/blog/ssl/mutual-auth.png) | 
|:--:| 
| *SSL Mutual Authentication. Image credit of [cloudboost.io](https://blog.cloudboost.io/implementing-mutual-ssl-authentication-fc20ab2392b3)* |


#### Generating SSL certificates
For this, we will use OpenSSl to generate our client certificate, of course for secure/production systems you can 
buy certificates from trusted authority like Sentigo. Here we will be our own Certificate Authority (CA) and issue both the server and client certificates. Assuming you have OpenSSL already setup.
*Create two folders/directories, i.e server and client where the correspoding certificates files will be stored.*
##### 1.0 Generate a certificate authority

```sh
openssl req -x509 -newkey rsa:4096 -keyout server/ca-key.pem -out server/ca-crt.pem -nodes -days 365
```
##### 2.0 Generate server private key

```sh
openssl genrsa -out server/server-key.pem 4096
```
##### 2.1 Generate server certificate signing request

```sh
openssl req -new -sha256 -key server/server-key.pem -out server/server-csr.pem
```
##### 2.2 Generate server certificate

```sh
openssl x509 -req -days 365 -in server/server-csr.pem -CA server/ca-crt.pem -CAkey server/ca-key.pem -CAcreateserial -out server/server-crt.pem
```
##### 3.0 Generate client private key

```sh
openssl genrsa -out client/client-key.pem 4096
```
##### 3.1 Generate client certificate signing request

```sh
openssl req -new -sha256 -key client/client-key.pem -out client/client-csr.pem
```
##### 3.2 Generate client certificate

```sh
openssl x509 -req -days 365 -in client/client-csr.pem -CA server/ca-crt.pem -CAkey server/ca-key.pem -CAcreateserial -out client/client-crt.pem
```

#### Some Code

Now, for the Node.js part, lets build a simple https server with express.

```js
const express = require("express");
const https = require("https");
const path = require("path");
const fs = require("fs");

const authenticate = require("./authenticate");
const errorHandler = require("./error-handler");

const PORT = process.env.PORT || 3000;
const app = express();

const __DIR = path.join(__dirname, './ssl/server');

const opts = {
	key: fs.readFileSync(path.join(__DIR, 'server-key.pem')),
	cert: fs.readFileSync(path.join(__DIR, 'server-crt.pem')),
	requestCert: true,
	rejectUnauthorized: true,
	ca: [
		fs.readFileSync(path.join(__DIR, 'ca-crt.pem'))
	]
};

app.use((err, req, res, next) => {
    errorHandler(err, res);
});

app.use("/private", authenticate, (req, res) => {
    res.status(200).json({message: 'Welcome to private section'})
});

app.use((err, req, res, next) => {
    errorHandler(err, res);
});

https.createServer(opts, app).listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});


```
Of importance here is this line:-

```js 
rejectUnauthorized: true 
```

With this, we reject any unauthenticated traffic. Ofcourse for debug purposes, you can set it to false since any unauthenticated requests will be reject silently.
Now for the fun part, let look at our authentication middleware.

```js 
const HttpException = require("./HttpException");

const authenticate = (req, res, next) => {
    const cert = req.socket.getPeerCertificate();
    const currentDate = new Date();
    const FINGERPRINT_SET = ['CB:D7:52:53:51:EC:6D:58:CB:65:5D:7E:85:CC:73:ED:88:AF:C2:08'];

    if (req.client.authorized === false) throw new HttpException(401, 'SSL certificate is require');

    // Validate validity date
    if (currentDate < new Date(cert.valid_from) || currentDate > new Date(cert.valid_to)) throw new HttpException(401, 'Expired certficate');

    //  Validate the fingerprint
    if (FINGERPRINT_SET.indexOf(cert.fingerprint) === -1) throw new HttpException(401, 'Fingerprint mismatch');

    // Validate the issuer
    if (cert.issuer.CN.toLowerCase() !== "localhost") throw new HttpException(401, 'Invalid issuer');

    // Everything looks good..

    next();
}

module.exports = authenticate;
```
Here, am a couple of values e.g fingerprint, dates etc to determine the authenticity of the provided certificate. Ofcourse, there are many parameters you could check against, but for the purpose of this entry, the above will suffice.

#### Testing
Am using Postman to simulate an API request. To set the client certificates on Postman, go to Settings > Certificates then add the CA and the client certificates.  | ![SSL Mutual Authentication](/images/blog/ssl/postman.png) | 
|:--:| 
| *Client certificate, Postman* |

Running this and hitting the `/private` end point, I get a success message:-

```json
{
    "message": "Welcome to private section"
}
```

Try providing an invalid certificate, and the request should fail with a `401` status code.

#### Sources

Get the project source code here: []()

#### References
1. [https://techcommunity.microsoft.com/t5/iis-support-blog/client-certificate-authentication-part-1/ba-p/324623](https://techcommunity.microsoft.com/t5/iis-support-blog/client-certificate-authentication-part-1/ba-p/324623)
2. [https://www.matteomattei.com/client-and-server-ssl-mutual-authentication-with-nodejs/](https://www.matteomattei.com/client-and-server-ssl-mutual-authentication-with-nodejs/)

