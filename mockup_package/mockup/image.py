import base64
import sys
from pathlib import Path
from pyodide.http import pyfetch
from mockup.image_generator import ImageGenerator as IG
import os


async def mockup(location, device_id, original_img_path_list, device_info):
    device_path_prefix = f"{location.split('/')[0]}//{location.split('/')[2]}"
    device_mask_path_prefix = device_path_prefix + "/images/mockup_mask_templates/"
    device_path_prefix += "/images/mockup_templates/"
    device_path = "./device.png"
    device_mask_path = "./device_mask.png"
    output_img_path_list = []
    for original_img_path in original_img_path_list:
        ig = IG(original_img_path, device_id, device_info)
        ig.create_fit_resolution_image()
        for spec in ig.phone_models.get(device_id).get("mockups").values():
            try:
                await process_response(
                    device_path_prefix + str(spec["image"]),
                    device_path,
                )
                await process_response(
                    device_mask_path_prefix + str(spec["image"]),
                    device_mask_path,
                )
            except Exception as e:
                print(e, file=sys.stderr)
                # js.errorBox(e)
                raise
            ig.create_fit_coord_image(spec)
            deviceView = str(spec["image"]).split("-")[-1].split(".")[0]
            path = (
                f"{os.path.splitext(os.path.basename(original_img_path))[0]}"
                + f"-{deviceView}.png"
            )
            ig.create_mockup_image(device_path, device_mask_path, path)
            output_img_path_list.append([path, original_img_path, deviceView])

    original_img_path_list.clear()
    return output_img_path_list


async def download(url):
    filename = Path(url).name
    response = await pyfetch(url)
    if response.status == 200:
        status = response.status
        with open(filename, mode="wb") as file:
            file.write(await response.bytes())
        return filename, status
    else:
        status = response.status
        filename = None
        return filename, status


async def process_response(url, path):
    response_content = await download(url)
    if response_content[1] == 200:
        data = base64.b64encode(open(response_content[0], "rb").read())
        data = data.decode("utf-8")
        imgdata = base64.b64decode(data)
        filename = path  # I assume you have a way of picking unique filenames
        with open(filename, "wb+") as f:
            f.write(imgdata)
        return filename
    else:
        src = None
        return src
