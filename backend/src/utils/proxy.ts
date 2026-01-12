export class ProxyManager {
  private proxies: string[] = [];
  private currentIndex = 0;

  constructor(proxies: string[]) {
    this.proxies = proxies;
  }

  getNext() {
    if (this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  getRandom() {
    if (this.proxies.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[randomIndex];
  }

  addProxy(proxy: string) {
    this.proxies.push(proxy);
  }

  removeProxy(proxy: string) {
    this.proxies = this.proxies.filter(p => p !== proxy);
  }
}
