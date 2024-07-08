import base64
import io
import os

from js import Uint8Array, imageUploadList
from PIL import Image


async def upload_single_image(origin_image, file_name, original_img_path_list):
    array_buf = Uint8Array.new(await origin_image.arrayBuffer())
    bytes_list = bytearray(array_buf)
    origin_bytes = io.BytesIO(bytes_list)
    my_image = Image.open(origin_bytes)
    filePath = f"./{file_name}.png"
    original_img_path_list.append(filePath)
    my_image.save(filePath)


async def upload_files():
    original_img_path_list = []
    for fileItem in imageUploadList:
        basename, ext = os.path.splitext(fileItem.name)
        if ext.lower() not in [".psd", ".jpg", ".jpeg", ".png"]:
            return
        await upload_single_image(fileItem, basename, original_img_path_list)
    return original_img_path_list


def save_image(imageList):
    returnList = []
    for image in imageList:
        path = image[0]
        deviceView = image[2]
        my_image = Image.open(path)
        my_stream = io.BytesIO()
        my_image.save(my_stream, format="PNG")
        binary_fc = open(path, "rb").read()
        base64_utf8_str = base64.b64encode(binary_fc).decode("utf-8")
        basename, ext = os.path.splitext(path)
        dataurl = f"data:image/{ext};base64,{base64_utf8_str}"
        returnList.append([f"img{basename}-{deviceView}", dataurl])
    return returnList
