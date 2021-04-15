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