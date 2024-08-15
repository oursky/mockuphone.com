import cv2
import json
from add_device_utils import to_kebab_case

x1, y1, x2, y2 = 0, 0, 0, 0

device_id = input("Input device_id(ex: samsung-galaxys20ultra-cosmicgrey): ")
device_color = input("Input device_color(ex: Pink): ")
device_color_hexcode = input("Input device_color_hexcode(ex: #F0CBD3): ")
device_name = input("Input device_name(ex: Samsung Galaxy S20): ")
device_type = input("Input device_type(Android/iOS/TV/Laptops/Macbook): ")

image_path = f"public/images/mockup_mask_templates/{device_id}-portrait.png"
img = cv2.imread(image_path)
cv2.namedWindow("image")
cv2.imshow("image", img)

h, w = img.shape[0], img.shape[1]
print(h, w)


def setX1(value):
    global x1
    x1 = value
    update_image()


def setY1(value):
    global y1
    y1 = value
    update_image()


def setX2(value):
    global x2
    x2 = value
    update_image()


def setY2(value):
    global y2
    y2 = value
    update_image()


def update_image():
    new_image = img.copy()
    cv2.putText(
        new_image,
        "(x1, y1)",
        (x1, y1 - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 0, 0),
        thickness=2,
    )
    cv2.putText(
        new_image,
        "(x2, y2)",
        (x2, y2 + 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 0, 0),
        thickness=2,
    )
    cv2.rectangle(new_image, (x1, y1), (x2, y2), (255, 0, 0), thickness=2)
    cv2.imshow("image", new_image)


cv2.createTrackbar("x1", "image", 0, w, setX1)
cv2.setTrackbarPos("x1", "image", 200)
cv2.createTrackbar("y1", "image", 0, h, setY1)
cv2.setTrackbarPos("y1", "image", 200)
cv2.createTrackbar("x2", "image", 0, w, setX2)
cv2.setTrackbarPos("x2", "image", w - 200)
cv2.createTrackbar("y2", "image", 0, h, setY2)
cv2.setTrackbarPos("y2", "image", h - 200)

while True:
    key = cv2.waitKey(0)
    print(key)
    if key == 46:  # "."
        print("Received . key. Printing Coords ...")
        print(
            [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
        )
    if key == 13:  # (carriage return)
        print("Received Enter key. Adding new device ...")
        new_device = {
            "credits": '<p><a href="http://facebook.design/devices" target="blank">'
            "Facebook - Design Resources</a></p>",
            "desc": f"{device_color}",
            "color": {
                "id": f"{to_kebab_case(device_color)}",
                "name": f"{device_color}",
                "hexcode": f"{device_color_hexcode}",
            },
            "meta_title": f"{device_name} {device_color} Mock Up",
            "meta_description": f"1 click to generate your {device_name} "
            f"{device_color} mockup! You can wrap screenshots in {device_name} "
            f"{device_color} for prototypes.",
            "display_resolution": [abs(x2 - x1), abs(y2 - y1)],
            "device_type": f"{device_type}",
            "device_id": f"{device_id}",
            "name": f"{device_name}",
            "orientations": [
                {
                    "alt": f"{device_name} {device_color} Mock Up",
                    "coords": [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
                    "name": "portrait",
                },
                {
                    "alt": f"{device_name} {device_color} Mock Up",
                    "coords": [
                        [h - y1, w - x2],
                        [h - y1, w - x1],
                        [h - y2, w - x1],
                        [h - y2, w - x2],
                    ],
                    "name": "landscape",
                },
            ],
            "is_mockup_image_at_front": True,
            "view_desc": "Portrait<br/>Landscape",
        }

        with open("src/scripts/device_info.json", "r") as json_file:
            data = json.load(json_file)

        data["devices"].append(new_device)

        with open("src/scripts/device_info.json", "w") as json_file:
            json.dump(data, json_file, indent=2)

    if key == 27:
        """ESC key to exit"""
        print("Received Esc key. Exiting ...")
        cv2.destroyAllWindows()
        break
