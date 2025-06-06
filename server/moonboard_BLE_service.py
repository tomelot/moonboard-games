import sys
import subprocess
import logging
import os
import json
import pty

import dbus
from gi.repository import GLib
from dbus.mainloop.glib import DBusGMainLoop

from gatt_base.gatt_lib_characteristic import Characteristic
from gatt_base.gatt_lib_service import Service
from moonboard_app_protocol import UnstuffSequence, decode_problem_string


DBUS_OM_IFACE = "org.freedesktop.DBus.ObjectManager"
BLUEZ_SERVICE_NAME = "org.bluez"
DBUS_OM_IFACE = "org.freedesktop.DBus.ObjectManager"
GATT_MANAGER_IFACE = "org.bluez.GattManager1"
UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
SERVICE_NAME = "com.moonboard"

# Configure logging first
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("moonboard.ble")


class PairingAgent(dbus.service.Object):
    AGENT_PATH = "/com/moonboard/PairingAgent"

    def __init__(self, bus):
        try:
            super().__init__(bus, self.AGENT_PATH)
            self.agent_manager = dbus.Interface(
                bus.get_object(BLUEZ_SERVICE_NAME, "/org/bluez"),
                "org.bluez.AgentManager1",
            )
            self.agent_manager.RegisterAgent(self.AGENT_PATH, "DisplayOnly")
            self.agent_manager.RequestDefaultAgent(self.AGENT_PATH)
            logger.info("Pairing agent registered with no passcode")
        except dbus.exceptions.DBusException as e:
            logger.error(f"Pairing agent failed: {e}")

    @dbus.service.method("org.bluez.Agent1", in_signature="ouq", out_signature="")
    def DisplayPasskey(self, device, passkey, entered):
        print("DisplayPasskey (%s, %06u entered %u)" % (device, passkey, entered))
        return


class RxCharacteristic(Characteristic):
    def __init__(self, bus, index, service, process_rx):
        Characteristic.__init__(
            self, bus, index, UART_RX_CHARACTERISTIC_UUID, ["write"], service
        )
        self.process_rx = process_rx

    def WriteValue(self, value, options):
        self.process_rx(value)


class UartService(Service):
    def __init__(self, bus, path, index, process_rx):
        Service.__init__(self, bus, path, index, UART_SERVICE_UUID, True)
        self.add_characteristic(RxCharacteristic(bus, 1, self, process_rx))


class MoonApplication(dbus.service.Object):
    def __init__(self, bus, logger):
        self.path = "/com/moonboard"
        self.services = []
        self.logger = logger
        dbus.service.Object.__init__(self, bus, self.path)
        self.add_service(UartService(bus, self.get_path(), 0, self.process_rx))
        self.unstuffer = UnstuffSequence(self.logger)

    def monitor_btmon(self):
        try:
            out_r, out_w = pty.openpty()
            with subprocess.Popen(["sudo", "btmon"], stdout=out_w) as proc:
                os.close(out_w)
                with os.fdopen(out_r, "r") as f:
                    while True:
                        line = f.readline()
                        if not line:
                            break
                        if "Data:" in line:
                            data = line.split("Data: ")[1].strip().replace(" ", "")
                            self.process_rx(bytes.fromhex(data))
        except Exception as e:
            self.logger.error(f"btmon failed: {e}")

    def process_rx(self, ba):
        bytes_data = bytes([int(b) for b in ba])
        new_problem_string = self.unstuffer.process_bytes(bytes_data)
        flags = self.unstuffer.flags

        try:
            if new_problem_string is not None:
                print(new_problem_string)
                problem = decode_problem_string(new_problem_string, flags)
                self.new_problem(json.dumps(problem))
                self.unstuffer.flags = ""
        except Exception as e:
            print(e)

    @dbus.service.signal(dbus_interface="com.moonboard", signature="s")
    def new_problem(self, problem):
        print(problem)
        self.logger.info("Signal new problem: " + str(problem))

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_service(self, service):
        self.services.append(service)

    @dbus.service.method(DBUS_OM_IFACE, out_signature="a{oa{sa{sv}}}")
    def GetManagedObjects(self):
        response = {}
        for service in self.services:
            response[service.get_path()] = service.get_properties()
            chrcs = service.get_characteristics()
            for chrc in chrcs:
                response[chrc.get_path()] = chrc.get_properties()
        return response


def configure_adapter():
    logger.info("Resetting Bluetooth adapter...")
    subprocess.run(["sudo", "hciconfig", "hci0", "down"], check=True)
    subprocess.run(["sudo", "hciconfig", "hci0", "up"], check=True)
    subprocess.run(["sudo", "hciconfig", "hci0", "leadv"], check=True)
    subprocess.run(["sudo", "hciconfig", "hci0", "encrypt"], check=True)
    subprocess.run(["sudo", "hciconfig", "hci0", "sspmode", "1"], check=True)
    logger.info("Adapter configured with SSP and secure connections")


def run(*popenargs, **kwargs):
    input = kwargs.pop("input", None)
    check = kwargs.pop("handle", False)

    if input is not None:
        if "stdin" in kwargs:
            raise ValueError("stdin and input arguments may not both be used.")
        kwargs["stdin"] = subprocess.PIPE

    process = subprocess.Popen(*popenargs, **kwargs)
    try:
        stdout, stderr = process.communicate(input)
    except:
        process.kill()
        process.wait()
        raise
    retcode = process.poll()
    if check and retcode:
        raise subprocess.CalledProcessError(
            retcode, process.args, output=stdout, stderr=stderr
        )
    return retcode, stdout, stderr


def setup_adv(logger):
    logger.info("setup adv")
    setup_adv = [
        "hcitool -i hci0 cmd 0x08 0x000a 00",
        "hcitool -i hci0 cmd 0x08 0x0008 18 02 01 06 02 0a 00 11 07 9e ca dc 24 0e e5 a9 e0 93 f3 a3 b5 01 00 40 6e 00 00 00 00 00 00 00",
        "hcitool -i hci0 cmd 0x08 0x0009 0d 0c 09 4d 6f 6f 6e 62 6f 61 72 64 20 41",
        "hcitool -i hci0 cmd 0x08 0x0006 80 02 c0 03 00 00 00 00 00 00 00 00 00 07 00",
    ]
    for c in setup_adv:
        run("sudo " + c, shell=True)


def start_adv(logger, start=True):
    if start:
        start = "01"
        logger.info("start adv")
    else:
        start = "00"
        logger.info("stop adv")
    start_adv = "hcitool -i hci0 cmd 0x08 0x000a {}".format(start)
    run("sudo " + start_adv, shell=True)


def get_adapter_path(bus):
    logger.debug("Searching for Bluetooth adapter...")
    manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, "/"), DBUS_OM_IFACE)
    objects = manager.GetManagedObjects()

    for path, interfaces in objects.items():
        if "org.bluez.Adapter1" in interfaces:
            logger.info(f"Found adapter at: {path}")
            return path

    # Fallback to common path
    fallback_path = "/org/bluez/hci0"
    try:
        bus.get_object(BLUEZ_SERVICE_NAME, fallback_path)
        logger.warning(f"Using fallback adapter path: {fallback_path}")
        return fallback_path
    except dbus.exceptions.DBusException:
        raise RuntimeError(
            "No Bluetooth adapter found. Check with:\n"
            "1. sudo hciconfig -a\n"
            "2. systemctl status bluetooth"
        )


def main():
    DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()

    try:
        configure_adapter()
        adapter_path = get_adapter_path(bus)
        PairingAgent(bus)

        try:
            bus_name = dbus.service.BusName(SERVICE_NAME, bus=bus, do_not_queue=True)
        except dbus.exceptions.NameExistsException:
            sys.exit(1)

        app = MoonApplication(bus_name, logger)
        service_manager = dbus.Interface(
            bus.get_object(BLUEZ_SERVICE_NAME, adapter_path), GATT_MANAGER_IFACE
        )
        service_manager.RegisterApplication(
            app.get_path(),
            {},
            reply_handler=lambda: logger.info("GATT registered"),
            error_handler=lambda e: logger.error(f"GATT error: {e}"),
        )

        setup_adv(logger)
        start_adv(logger)

        logger.info("Service started successfully")
        GLib.MainLoop().run()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        logger.info("Service stopped")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Shutting down by user request")
