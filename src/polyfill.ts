// Polyfill for MessageChannel which is missing in some Cloudflare Worker environments during validation/build
// This is required for React 19 server-side rendering on Cloudflare Workers
if (typeof MessageChannel === 'undefined') {
  // @ts-ignore
  globalThis.MessageChannel = class MessageChannel {
    port1: any;
    port2: any;
    constructor() {
      this.port1 = {
        onmessage: null,
        postMessage: (data: any) => {
          if (this.port2.onmessage) {
            // Use Promise to simulate microtask if setTimeout is not ideal,
            // but setTimeout is generally available in Workers
            setTimeout(() => {
              if (this.port2.onmessage) this.port2.onmessage({ data });
            }, 0);
          }
        }
      };
      this.port2 = {
        onmessage: null,
        postMessage: (data: any) => {
          if (this.port1.onmessage) {
            setTimeout(() => {
              if (this.port1.onmessage) this.port1.onmessage({ data });
            }, 0);
          }
        }
      };
    }
  };
}
