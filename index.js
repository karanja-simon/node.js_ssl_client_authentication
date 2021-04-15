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
