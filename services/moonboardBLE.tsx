import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, NativeEventEmitter, NativeModules, EmitterSubscription } from 'react-native';
import base64 from 'react-native-base64';
import ConfigService from './ConfigService';

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const DEVICE_NAME = "moonboard";

export const BLE_UPDATE_STATE_EVENT_TYPE = "BleUpdateState";

export type ConnectionStatus =
    | 'idle'
    | 'scanning'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error';

export interface BLEState {
    status: ConnectionStatus;
    message?: string;
}

class MoonboardBLE {
    private bleManager: BleManager;
    private connectedDevice: Device | null = null;
    private status: ConnectionStatus = 'idle';
    private eventEmitter = new NativeEventEmitter(NativeModules.BleManager);
    private refCount = 0;

    constructor() {
        this.bleManager = new BleManager();
        this.setupListeners();
    }

    private setupListeners() {
        this.eventEmitter.addListener(BLE_UPDATE_STATE_EVENT_TYPE, (state: BLEState) => {
            this.updateStatus(state);
        });
    }

    private updateStatus(state: BLEState) {
        this.status = state.status;
        console.log(`Status: ${this.status}`, state.message || '');
    }

    public getCurrentStatus(): ConnectionStatus {
        return this.status;
    }

    async connect() {
        this.refCount++;
        if (this.refCount > 1) return;
        if (this.status === 'connected') return;

        try {
            this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'scanning' });

            if (!this.bleManager) {
                throw new Error('BLE Manager not initialized');
            }

            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                if (
                    granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED ||
                    granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    throw new Error('Bluetooth permissions denied');
                }
            }

            const device = await this.scanForDevice();
            this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'connecting' });
            if (!await device.isConnected()) {
                await device.connect();
            }
            this.connectedDevice = device;
            await this.connectedDevice.discoverAllServicesAndCharacteristics();
            this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'connected' });
            return true;
        } catch (error) {
            this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' });
            throw error;
        }
    }

    private async scanForDevice(timeout = 30000): Promise<Device> {
        return new Promise((resolve, reject) => {
            let timeoutHandle: NodeJS.Timeout;
            let scanSubscription: { remove: () => void } | null = null;

            // Create the subscription object
            const subscription = {
                remove: () => this.bleManager.stopDeviceScan()
            };

            scanSubscription = subscription;

            // Start the device scan
            this.bleManager.startDeviceScan(null, null, (error, device) => {
                if (error) {
                    cleanup();
                    reject(error);
                    return;
                }

                if (device?.name?.toLowerCase().includes(DEVICE_NAME)) {
                    cleanup();
                    resolve(device);
                }
            });

            // Set timeout
            // TODO: fix ref count timeout on previous
            timeoutHandle = setTimeout(() => {
                cleanup();
                reject(new Error('Device not found'));
            }, timeout);

            // Cleanup function
            const cleanup = () => {
                if (scanSubscription) {
                    scanSubscription.remove();
                    scanSubscription = null;
                }
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
            };
        });
    }

    async sendData(data: string) {
        if (!this.connectedDevice || this.status !== 'connected') {
            throw new Error('Not connected to device');
        }

        // TODO: mutex here

        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        try {
            const service = await this.connectedDevice.services();
            const characteristic = await service
                .find(s => s.uuid === UART_SERVICE_UUID)
                ?.characteristics()
                .then(cs => cs.find(c => c.uuid === UART_RX_CHARACTERISTIC_UUID));

            if (!characteristic) {
                throw new Error('Characteristic not found');
            }

            const currentMtu = ConfigService.mtu;
            const currentDelay = ConfigService.delay;
            for (let i = 0; i < data.length; i += currentMtu) {
                const chunk = data.slice(i, i + currentMtu);
                await characteristic.writeWithoutResponse(base64.encode(chunk));
                await delay(currentDelay);
            }
        } catch (error) {
            this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' });
            throw error;
        }
    }

    async disconnect() {
        this.refCount--;
        if (this.refCount > 0) return;
        if (this.connectedDevice) {
            try {
                await this.connectedDevice.cancelConnection();
                this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'disconnected' });
            } catch (error) {
                this.eventEmitter.emit(BLE_UPDATE_STATE_EVENT_TYPE, { status: 'error', message: 'Disconnection failed' });
            }
        }
        this.connectedDevice = null;
    }

    addListener(eventType: string, listener: (event: any) => void, context?: Object): EmitterSubscription {
        return this.eventEmitter.addListener(eventType, listener, context);
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }
}

export default new MoonboardBLE();
