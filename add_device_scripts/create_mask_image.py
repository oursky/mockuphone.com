import os
import sys
from PIL import Image, ImageDraw


def bfs(img):
    w, h = img.size
    x = w // 2
    y = h // 2
    seed = (x, y)
    rep_value = (0, 0, 0, 255)
    ImageDraw.floodfill(img, seed, rep_value, thresh=10)


def check(data, x, y):
    r, g, b, alpha = data[x, y]
    if alpha < 250:
        data[x, y] = (0, 0, 0, 255)
        return True
    else:
        # print(r,b,g,alpha)
        return False


def bfs2(image):
    data = image.load()
    w, h = image.size
    x = w // 2
    y = h // 2
    positionsList = [(x, y)]
    while len(positionsList) != 0:
        t = positionsList.pop()
        x = t[0]
        y = t[1]
        if check(data, x, y + 1):
            positionsList.append((x, y + 1))
        if check(data, x, y - 1):
            positionsList.append((x, y - 1))
        if check(data, x + 1, y):
            positionsList.append((x + 1, y))
        if check(data, x - 1, y):
            positionsList.append((x - 1, y))


path = "public/Images/mockup_templates"
device_path = "public/Images/devices_picture"
outputPath = "public/Images/mockup_mask_templates"
if len(sys.argv) == 1:
    print("use default path ", path)
else:
    path = sys.argv[1]
    print("use argv path", path)

total = len(os.listdir(path))
for i, file in enumerate(os.listdir(path)):
    output_file_path = f"{outputPath}/{file}"
    if os.path.exists(output_file_path) or file == ".DS_Store":
        continue
    print(f"start build {file} mask image.   {i + 1}/{total}")
    img = Image.open(f"{path}/{file}").convert("RGBA")
    img.save(f"{device_path}/{file}")
    bfs2(img)
    img.save(f"{outputPath}/{file}")
    img.close()
