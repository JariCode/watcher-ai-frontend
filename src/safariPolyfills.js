// Polyfill vanhemmille Safari/WebKit-versioille (PDF.js tarvitsee nämä).

// Promise.withResolvers (puuttuu vanhemmasta Safarista)
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// URL.parse (puuttuu vanhemmasta Safarista)
if (typeof URL.parse !== 'function') {
  URL.parse = function (url, base) {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  };
}