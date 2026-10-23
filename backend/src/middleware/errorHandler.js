const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'That request could not be read.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'That request is too large.' });
  }

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;

  if (status >= 500) {
    console.error(err);
  }

  const message =
    status === 500
      ? 'Something went wrong on our end. Please try again in a moment.'
      : err.message || 'That action could not be completed.';

  res.status(status).json({ success: false, message });
};

export default errorHandler;
