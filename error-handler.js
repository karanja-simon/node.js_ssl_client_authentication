const errorHandler = (err, res) => {
    const { status, message } = err;

    res.status(status || 500);

    return res.json({
        status: err.status || "error",
        message
    });
}

module.exports = errorHandler;