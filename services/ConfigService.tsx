export const DEFAULT_MTU = 20;
export const DEFAULT_DELAY = 0;

class ConfigService {
    private static instance: ConfigService;
    private _mtu = DEFAULT_MTU;
    private _delay = DEFAULT_DELAY;

    private constructor() { }

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    get mtu(): number {
        return this._mtu;
    }

    set mtu(value: number) {
        this._mtu = Math.min(DEFAULT_MTU, Math.max(1, value));
    }

    get delay(): number {
        return this._delay;
    }

    set delay(value: number) {
        this._delay = Math.max(0, value);
    }
}

export default ConfigService.getInstance();
