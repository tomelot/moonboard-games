import json
import curses
import time
from threading import Thread

import dbus
from gi.repository import GLib
from dbus.mainloop.glib import DBusGMainLoop

g_pixels = []


def draw_screen(stdscr, pixels):
    # Define color pairs
    curses.start_color()
    curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)  # S - Green
    curses.init_pair(2, curses.COLOR_BLUE, curses.COLOR_BLACK)  # P - Blue
    curses.init_pair(3, curses.COLOR_RED, curses.COLOR_BLACK)  # E - Red

    # Avoid flickering by using a pad instead of clearing the whole screen
    stdscr.erase()

    # Draw column headers
    cols = "ABCDEFGHIJK"
    stdscr.addstr(0, 4, " ".join(cols))

    # Draw row numbers (starting from bottom to top)
    for row in range(18, 0, -1):
        stdscr.addstr(19 - row, 0, f"{row:2} ")
        for col in range(11):
            stdscr.addstr(19 - row, 4 + col * 2, ".")  # Empty pixel placeholder

    # Draw pixels
    for pixel in pixels:
        if len(pixel) >= 3:
            color_char, col_char, row_num = pixel[0], pixel[1], pixel[2:]
            if row_num.isdigit():
                row = int(row_num)
                col = ord(col_char.upper()) - ord("A")
                color_pair = (
                    1
                    if color_char == "S"
                    else 2
                    if color_char == "P"
                    else 3
                    if color_char == "E"
                    else 0
                )
                if color_pair:
                    stdscr.addstr(
                        19 - row, 4 + col * 2, color_char, curses.color_pair(color_pair)
                    )

    stdscr.refresh()


def handle_notification(s):
    problem = json.loads(s)
    start_pixels = problem["START"]
    move_pixels = problem["MOVES"]
    top_pixels = problem["TOP"]

    global g_pixels
    g_pixels = (
        ["S" + x for x in start_pixels]
        + ["P" + x for x in move_pixels]
        + ["E" + x for x in top_pixels]
    )


def main(stdscr):
    global g_pixels
    stdscr.nodelay(True)  # Make getch non-blocking
    while True:
        draw_screen(stdscr, g_pixels)
        time.sleep(0.1)  # Small delay to prevent excessive CPU usage
        key = stdscr.getch()
        if key == ord("q"):
            break


def main2():
    dbml = DBusGMainLoop(set_as_default=True)

    bus = dbus.SystemBus()
    proxy = bus.get_object("com.moonboard", "/com/moonboard")

    proxy.connect_to_signal("new_problem", handle_notification)
    loop = GLib.MainLoop()

    dbus.set_default_main_loop(dbml)

    # Run the loop
    try:
        loop.run()
    except KeyboardInterrupt:
        print("keyboard interrupt received")
    except Exception as e:
        print("Unexpected exception occurred: '{}'".format(str(e)))
    finally:
        loop.quit()


if __name__ == "__main__":
    Thread(target=main2, args=()).start()
    curses.wrapper(main)
