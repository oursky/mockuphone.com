import cv2
import numpy as np

x1, y1, x2, y2, x3, y3, x4, y4 = 0, 0, 0, 0, 0, 0, 0, 0

image_path = input(
    "Input image path\n(ex: public/images/devices_picture/"
    "apple-ipadpro11-spacegrey-right.png)\n"
)
img = cv2.imread(image_path)
cv2_window_name = "image-angled"
cv2.namedWindow(cv2_window_name)
cv2.imshow(cv2_window_name, img)

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


def setX3(value):
    global x3
    x3 = value
    update_image()


def setY3(value):
    global y3
    y3 = value
    update_image()


def setX4(value):
    global x4
    x4 = value
    update_image()


def setY4(value):
    global y4
    y4 = value
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
    cv2.putText(
        new_image,
        "(x3, y3)",
        (x3, y3 - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 0, 0),
        thickness=2,
    )
    cv2.putText(
        new_image,
        "(x4, y4)",
        (x4, y4 + 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 0, 0),
        thickness=2,
    )
    pts = np.array([[x1, y1], [x2, y2], [x3, y3], [x4, y4]], np.int32)
    pts = pts.reshape((-1, 1, 2))
    cv2.polylines(new_image, [pts], True, (0, 255, 255), thickness=3, lineType=8)
    cv2.imshow(cv2_window_name, new_image)


cv2.createTrackbar("x1", cv2_window_name, 0, w, setX1)
cv2.setTrackbarPos("x1", cv2_window_name, 200)
cv2.createTrackbar("y1", cv2_window_name, 0, h, setY1)
cv2.setTrackbarPos("y1", cv2_window_name, 200)
cv2.createTrackbar("x2", cv2_window_name, 0, w, setX2)
cv2.setTrackbarPos("x2", cv2_window_name, w - 200)
cv2.createTrackbar("y2", cv2_window_name, 0, h, setY2)
cv2.setTrackbarPos("y2", cv2_window_name, 200)
cv2.createTrackbar("x3", cv2_window_name, 0, w, setX3)
cv2.setTrackbarPos("x3", cv2_window_name, w - 200)
cv2.createTrackbar("y3", cv2_window_name, 0, h, setY3)
cv2.setTrackbarPos("y3", cv2_window_name, h - 200)
cv2.createTrackbar("x4", cv2_window_name, 0, w, setX4)
cv2.setTrackbarPos("x4", cv2_window_name, 200)
cv2.createTrackbar("y4", cv2_window_name, 0, h, setY4)
cv2.setTrackbarPos("y4", cv2_window_name, h - 200)

while True:
    key = cv2.waitKey(0)
    print(key)

    if key == 13:
        print("Received Enter key. Printing coords ...")
        coords = [[x1, y1], [x2, y1], [x3, y3], [x4, y4]]
        print(coords)

    if key == 27:
        """ESC key to exit"""
        print("Received Esc key. Exiting ...")
        cv2.destroyAllWindows()
        break
