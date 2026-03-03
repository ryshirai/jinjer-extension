(() => {
  const loggedMessages = new Map();

  const logOnce = (key, message) => {
    if (loggedMessages.get(key) !== message) {
      console.log(message);
      loggedMessages.set(key, message);
    }
  };

  const clear = (key) => {
    loggedMessages.delete(key);
  };

  const logSummary = (key, message) => {
    logOnce(`summary-${key}`, message);
  };

  const clearSummary = (key) => {
    clear(`summary-${key}`);
  };

  window.JINJER_EXTENSION = {
    ...(window.JINJER_EXTENSION || {}),
    logger: {
      logOnce,
      clear,
      logSummary,
      clearSummary,
    },
  };
})();
